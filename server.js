// ═══════════════════════════════════════════════════════
// GuiaScan Backend v3.0 — Felipe Ensuncho © 2026
// Inventario con variantes + confirmación de descuento
// ═══════════════════════════════════════════════════════

const express  = require('express');
const cors     = require('cors');
const multer   = require('multer');
const pdf      = require('pdf-parse');
const mongoose = require('mongoose');
const path     = require('path');

const app  = express();
const PORT = process.env.PORT || 8080;
const MONGO_URI = process.env.MONGO_URI || '';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ════════════════════════════════════════════
// MODELOS
// ════════════════════════════════════════════
const GuiaSchema = new mongoose.Schema({
  codigo:    { type: String, required: true, unique: true },
  destino:   { type: String, default: '' },
  contenido: { type: String, default: '' },
  productos: [{ nombre: String, cantidad: Number, sku: String }],
  estado:    { type: String, enum: ['pen','rev'], default: 'pen' },
  hora:      { type: String, default: null },
  creadoEn:  { type: Date, default: Date.now },
  revisadoEn:{ type: Date, default: null }
});

const ProductoSchema = new mongoose.Schema({
  sku:       { type: String, required: true, unique: true },
  nombre:    { type: String, required: true },
  categoria: { type: String, default: 'General' },
  color:     { type: String, default: '' },
  cantidad:  { type: Number, default: 0 },
  minimo:    { type: Number, default: 3 },
  keywords:  [String], // palabras clave para matching con texto del PDF
  actualizadoEn: { type: Date, default: Date.now }
});

const MovimientoSchema = new mongoose.Schema({
  sku:      String, nombre: String,
  tipo:     { type: String, enum: ['entrada','salida','ajuste'] },
  cantidad: Number, motivo: String, guia: String,
  fecha:    { type: Date, default: Date.now }
});

const Guia      = mongoose.model('Guia', GuiaSchema);
const Producto  = mongoose.model('Producto', ProductoSchema);
const Movimiento= mongoose.model('Movimiento', MovimientoSchema);

let memGuias = {}, memProductos = {}, dbConectada = false;

async function conectarDB() {
  if (!MONGO_URI) { console.log('⚠️  Sin MONGO_URI — modo memoria'); return false; }
  try { await mongoose.connect(MONGO_URI); console.log('✅ MongoDB conectado'); return true; }
  catch(e) { console.error('❌ MongoDB:', e.message); return false; }
}

// ════════════════════════════════════════════
// GUÍAS
// ════════════════════════════════════════════
app.get('/api/guias', async (req, res) => {
  try {
    if (dbConectada) {
      const guias = await Guia.find({}).sort({ creadoEn: -1 });
      const obj = {};
      guias.forEach(g => { obj[g.codigo] = { destino:g.destino, contenido:g.contenido, productos:g.productos||[], estado:g.estado, hora:g.hora }; });
      return res.json({ guias: obj });
    }
    res.json({ guias: memGuias });
  } catch(e) { res.json({ guias: memGuias }); }
});

// Verificar + buscar qué descontaría (sin descontar aún)
app.post('/api/verificar', async (req, res) => {
  const { codigo } = req.body;
  if (!codigo) return res.json({ ok:false, msg:'Sin código' });
  const code = extraerCodigo(codigo);

  try {
    let g = dbConectada ? await Guia.findOne({ codigo: code }) : memGuias[code];
    if (!g) return res.json({ resultado:'NO_ENCONTRADA', codigo:code, msg:'No está en la lista' });

    const estado = dbConectada ? g.estado : g.estado;
    if (estado === 'rev') {
      return res.json({ resultado:'DUPLICADA', codigo:code, msg:'Ya revisada a las '+(g.hora||''), destino:g.destino, contenido:g.contenido });
    }

    // Buscar qué productos descontaría
    const productos = dbConectada ? (g.productos||[]) : (g.productos||[]);
    const preview = await calcularDescuento(g.contenido, productos);

    return res.json({
      resultado: 'PENDIENTE_CONFIRMACION',
      codigo: code,
      destino: g.destino,
      contenido: g.contenido,
      descuento_preview: preview   // ← el usuario verá esto y confirmará
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok:false, msg:'Error interno' });
  }
});

// Confirmar descuento después de que el usuario aprueba
app.post('/api/confirmar', async (req, res) => {
  const { codigo, confirmar } = req.body;
  if (!codigo) return res.json({ ok:false, msg:'Sin código' });

  try {
    let g = dbConectada ? await Guia.findOne({ codigo }) : memGuias[codigo];
    if (!g) return res.json({ ok:false, msg:'Guía no encontrada' });

    // Marcar como revisada
    if (dbConectada) {
      g.estado = 'rev'; g.hora = horaActual(); g.revisadoEn = new Date();
      await g.save();
    } else {
      memGuias[codigo].estado = 'rev'; memGuias[codigo].hora = horaActual();
    }

    let descuentoRealizado = [];
    if (confirmar !== false) {
      // Ejecutar el descuento real
      descuentoRealizado = await ejecutarDescuento(g.contenido, g.productos||[], codigo);
    }

    return res.json({
      resultado: 'REVISADA',
      codigo,
      destino: g.destino,
      contenido: g.contenido,
      hora: g.hora || horaActual(),
      descuento: descuentoRealizado
    });
  } catch(e) {
    console.error(e);
    res.status(500).json({ ok:false, msg:'Error interno' });
  }
});

app.post('/api/importar-pdf', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.json({ ok:false, msg:'Sin archivo' });
  try {
    const data  = await pdf(req.file.buffer);
    const items = extraerDelPDF(data.text);
    let agregadas = 0;
    if (dbConectada) {
      for (const item of items) {
        const existe = await Guia.findOne({ codigo: item.code });
        if (!existe) { await Guia.create({ codigo:item.code, destino:item.destino, contenido:item.contenido, productos:item.productos||[] }); agregadas++; }
      }
    } else {
      items.forEach(item => {
        if (!memGuias[item.code]) { memGuias[item.code] = { destino:item.destino, contenido:item.contenido, productos:item.productos||[], estado:'pen', hora:null }; agregadas++; }
      });
    }
    res.json({ ok:true, total:items.length, agregadas, msg:`${agregadas} guías nuevas` });
  } catch(e) { console.error(e); res.json({ ok:false, msg:'Error leyendo PDF' }); }
});

app.post('/api/importar-texto', async (req, res) => {
  const { texto } = req.body; if (!texto) return res.json({ ok:false, msg:'Sin texto' });
  const lineas = texto.split(/[\n\r]+/).map(l=>l.trim()).filter(Boolean);
  let agregadas = 0;
  if (dbConectada) {
    for (const l of lineas) {
      const p = l.split(/[,;\t]/); const code = p[0].trim(); if (!code) continue;
      const existe = await Guia.findOne({ codigo:code });
      if (!existe) { await Guia.create({ codigo:code, destino:p[1]?.trim()||'', contenido:p[2]?.trim()||'' }); agregadas++; }
    }
  } else {
    lineas.forEach(l => { const p=l.split(/[,;\t]/); const c=p[0].trim(); if(c&&!memGuias[c]){memGuias[c]={destino:p[1]?.trim()||'',contenido:p[2]?.trim()||'',productos:[],estado:'pen',hora:null};agregadas++;} });
  }
  res.json({ ok:true, agregadas, msg:`${agregadas} guías` });
});

app.delete('/api/guias/:codigo', async (req, res) => {
  const code = decodeURIComponent(req.params.codigo);
  if (dbConectada) await Guia.deleteOne({ codigo:code }); else delete memGuias[code];
  res.json({ ok:true });
});

app.post('/api/reiniciar', async (req, res) => {
  if (dbConectada) await Guia.updateMany({}, { estado:'pen', hora:null, revisadoEn:null });
  else Object.keys(memGuias).forEach(c => { memGuias[c].estado='pen'; memGuias[c].hora=null; });
  res.json({ ok:true });
});

app.post('/api/borrar-todo', async (req, res) => {
  if (dbConectada) await Guia.deleteMany({}); else memGuias={};
  res.json({ ok:true });
});

app.get('/api/exportar', async (req, res) => {
  const filas=['Guia,Destino,Contenido,Estado,Hora'];
  if (dbConectada) { const gs=await Guia.find({}); gs.forEach(g=>filas.push([g.codigo,g.destino,g.contenido,g.estado==='rev'?'REVISADO':'PENDIENTE',g.hora||''].join(','))); }
  else Object.keys(memGuias).forEach(c=>{const g=memGuias[c];filas.push([c,g.destino,g.contenido,g.estado==='rev'?'REVISADO':'PENDIENTE',g.hora||''].join(','));});
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition','attachment;filename=guias.csv');
  res.send('\uFEFF'+filas.join('\n'));
});

// ════════════════════════════════════════════
// INVENTARIO
// ════════════════════════════════════════════
app.get('/api/inventario', async (req, res) => {
  try {
    if (dbConectada) { const ps=await Producto.find({}).sort({categoria:1,nombre:1}); return res.json({ ok:true, productos:ps }); }
    res.json({ ok:true, productos:Object.values(memProductos) });
  } catch(e) { res.json({ ok:false, productos:[] }); }
});

app.post('/api/inventario', async (req, res) => {
  const { sku, nombre, categoria, color, cantidad, minimo } = req.body;
  if (!sku||!nombre) return res.json({ ok:false, msg:'SKU y nombre requeridos' });
  try {
    if (dbConectada) {
      const p = await Producto.findOneAndUpdate({ sku }, { nombre, categoria:categoria||'General', color:color||'', cantidad:Number(cantidad)||0, minimo:Number(minimo)||3, actualizadoEn:new Date() }, { upsert:true, new:true });
      return res.json({ ok:true, producto:p });
    }
    memProductos[sku] = { sku, nombre, categoria:categoria||'General', color:color||'', cantidad:Number(cantidad)||0, minimo:Number(minimo)||3 };
    res.json({ ok:true, producto:memProductos[sku] });
  } catch(e) { res.json({ ok:false, msg:'Error guardando' }); }
});

// Importar inventario desde CSV
app.post('/api/inventario/importar-csv', upload.single('csv'), async (req, res) => {
  if (!req.file) return res.json({ ok:false, msg:'Sin archivo' });
  try {
    const text = req.file.buffer.toString('utf-8');
    const lines = text.split(/[\n\r]+/).filter(l=>l.trim());
    let importados = 0, actualizados = 0;

    for (let i=1; i<lines.length; i++) {
      const parts = lines[i].split(',');
      if (parts.length < 5) continue;
      const sku      = parts[0].trim();
      const nombre   = parts[1].trim();
      const categoria= parts[2].trim() || 'General';
      const color    = parts[3].trim() || '';
      const cantidad = parseInt(parts[4]) || 0;
      const minimo   = parseInt(parts[5]) || 3;
      if (!sku || !nombre) continue;

      if (dbConectada) {
        const existe = await Producto.findOne({ sku });
        if (existe) { existe.cantidad=cantidad; existe.nombre=nombre; existe.categoria=categoria; existe.color=color; existe.minimo=minimo; await existe.save(); actualizados++; }
        else { await Producto.create({ sku, nombre, categoria, color, cantidad, minimo }); importados++; }
      } else {
        if (memProductos[sku]) actualizados++; else importados++;
        memProductos[sku] = { sku, nombre, categoria, color, cantidad, minimo };
      }
    }
    res.json({ ok:true, importados, actualizados, msg:`${importados} nuevos, ${actualizados} actualizados` });
  } catch(e) { console.error(e); res.json({ ok:false, msg:'Error procesando CSV' }); }
});

app.patch('/api/inventario/:sku/ajuste', async (req, res) => {
  const { sku } = req.params;
  const { cantidad, tipo, motivo } = req.body;
  try {
    if (dbConectada) {
      const p = await Producto.findOne({ sku }); if (!p) return res.json({ ok:false, msg:'No encontrado' });
      const c = Number(cantidad);
      if (tipo==='entrada') p.cantidad+=c; else if (tipo==='salida') p.cantidad=Math.max(0,p.cantidad-c); else p.cantidad=c;
      p.actualizadoEn=new Date(); await p.save();
      await Movimiento.create({ sku, nombre:p.nombre, tipo, cantidad:c, motivo:motivo||'Ajuste manual' });
      return res.json({ ok:true, producto:p, stockBajo:p.cantidad<=p.minimo });
    }
    const p=memProductos[sku]; if (!p) return res.json({ ok:false, msg:'No encontrado' });
    const c=Number(cantidad);
    if (tipo==='entrada') p.cantidad+=c; else if (tipo==='salida') p.cantidad=Math.max(0,p.cantidad-c); else p.cantidad=c;
    res.json({ ok:true, producto:p, stockBajo:p.cantidad<=p.minimo });
  } catch(e) { res.json({ ok:false, msg:'Error' }); }
});

app.delete('/api/inventario/:sku', async (req, res) => {
  if (dbConectada) await Producto.deleteOne({ sku:req.params.sku }); else delete memProductos[req.params.sku];
  res.json({ ok:true });
});

app.get('/api/inventario/exportar', async (req, res) => {
  const filas=['SKU,Nombre,Categoria,Color,Cantidad,Minimo'];
  if (dbConectada) { const ps=await Producto.find({}); ps.forEach(p=>filas.push([p.sku,p.nombre,p.categoria,p.color||'',p.cantidad,p.minimo].join(','))); }
  else Object.values(memProductos).forEach(p=>filas.push([p.sku,p.nombre,p.categoria||'',p.color||'',p.cantidad,p.minimo||3].join(',')));
  res.setHeader('Content-Type','text/csv;charset=utf-8');
  res.setHeader('Content-Disposition','attachment;filename=inventario.csv');
  res.send('\uFEFF'+filas.join('\n'));
});

app.get('/api/inventario/movimientos', async (req, res) => {
  try {
    if (dbConectada) { const ms=await Movimiento.find({}).sort({fecha:-1}).limit(200); return res.json({ ok:true, movimientos:ms }); }
    res.json({ ok:true, movimientos:[] });
  } catch(e) { res.json({ ok:false, movimientos:[] }); }
});

// ════════════════════════════════════════════
// IMPORTAR FACTURA PDF → ENTRADA DE INVENTARIO
// POST /api/importar-factura
// ════════════════════════════════════════════
app.post('/api/importar-factura', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.json({ ok:false, msg:'Sin archivo' });
  try {
    const data  = await pdf(req.file.buffer);
    const items = extraerFactura(data.text);

    if (!items.length) {
      return res.json({ ok:false, msg:'No se detectaron productos en la factura', preview:[] });
    }

    // Si solo se pide preview (sin confirmar)
    if (req.body.preview === 'true') {
      // Enriquecer con info del inventario
      const enriched = [];
      for (const item of items) {
        const matches = await buscarProducto(item.nombre);
        enriched.push({
          nombreFactura: item.nombre,
          cantidad:      item.cantidad,
          precio:        item.precio,
          sku:           matches[0]?.sku || null,
          nombreInventario: matches[0]?.nombre || null,
          stockActual:   matches[0]?.cantidad ?? null,
          encontrado:    matches.length > 0
        });
      }
      return res.json({ ok:true, preview: enriched });
    }

    // Confirmar y aplicar entradas
    let aplicados = 0;
    let noEncontrados = [];
    for (const item of items) {
      const matches = await buscarProducto(item.nombre);
      if (matches.length > 0) {
        const p = matches[0];
        if (dbConectada) {
          p.cantidad += item.cantidad;
          p.actualizadoEn = new Date();
          await p.save();
          await Movimiento.create({
            sku: p.sku, nombre: p.nombre,
            tipo: 'entrada', cantidad: item.cantidad,
            motivo: `Factura: ${item.nombre}`, guia: ''
          });
        } else {
          if (memProductos[p.sku]) memProductos[p.sku].cantidad += item.cantidad;
        }
        aplicados++;
      } else {
        noEncontrados.push(item.nombre);
      }
    }

    res.json({
      ok: true,
      aplicados,
      total: items.length,
      noEncontrados,
      msg: `${aplicados} productos actualizados en inventario`
    });

  } catch(err) {
    console.error(err);
    res.json({ ok:false, msg:'Error leyendo la factura' });
  }
});

// ════════════════════════════════════════════
// LÓGICA OCULTA — Extraer productos de factura
// Detecta tabla: Nombre | Cantidad | Precio | Valor
// Compatible con formato Breiner Monsalve y similares
// ════════════════════════════════════════════
function extraerFactura(text) {
  const items = [];
  const lineas = text.split(/[\n\r]+/).map(l => l.trim()).filter(Boolean);
  let enTabla = false;

  for (let i = 0; i < lineas.length; i++) {
    const l = lineas[i];

    // Detectar inicio de tabla de productos
    if (/Productos?\s+Cantidad/i.test(l) || /^Productos?$/i.test(l)) {
      enTabla = true; continue;
    }
    // Detectar fin de tabla
    if (enTabla && /^Total[:\s]/i.test(l)) { enTabla = false; break; }

    if (enTabla && l.length > 3) {
      // Patrón 1: "Nombre del producto   15   $ 25.500   $ 382.500"
      // El nombre puede tener varias palabras, luego número, luego precio
      const m1 = l.match(/^(.+?)\s{2,}(\d+)\s+\$\s*([\d.,]+)\s+\$\s*([\d.,]+)$/);
      if (m1) {
        const nombre = m1[1].trim();
        const cantidad = parseInt(m1[2]);
        const precio = parsePrecio(m1[3]);
        if (nombre.length > 2 && cantidad > 0) items.push({ nombre, cantidad, precio });
        continue;
      }

      // Patrón 2: línea solo con nombre, siguiente línea tiene cantidad y precio
      // "Ruana 3 botón polar\n15   $25.500   $382.500"
      const m2 = l.match(/^(\d+)\s+\$\s*([\d.,]+)/);
      if (m2 && i > 0) {
        const nombrePrev = lineas[i-1].trim();
        if (!/Cantidad|Precio|Valor|Total|\$/i.test(nombrePrev) && nombrePrev.length > 2) {
          items.push({ nombre: nombrePrev, cantidad: parseInt(m2[1]), precio: parsePrecio(m2[2]) });
        }
        continue;
      }

      // Patrón 3: "Nombre   15   25500   382500" (sin signos $)
      const m3 = l.match(/^(.+?)\s{2,}(\d+)\s+([\d.,]+)\s+([\d.,]+)$/);
      if (m3) {
        const nombre = m3[1].trim();
        const cantidad = parseInt(m3[2]);
        if (nombre.length > 2 && cantidad > 0 && !/Cantidad|Precio/i.test(nombre)) {
          items.push({ nombre, cantidad, precio: parsePrecio(m3[3]) });
        }
      }
    }
  }

  // Fallback: si no se detectó tabla, buscar pares nombre+cantidad en todo el texto
  if (!items.length) {
    const re = /([A-ZÁÉÍÓÚÑ][a-záéíóúñA-ZÁÉÍÓÚÑ\s\d.]+?)\s{2,}(\d{1,4})\s+\$\s*([\d.,]+)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const nombre = m[1].trim();
      const cantidad = parseInt(m[2]);
      if (nombre.length > 3 && cantidad > 0 && cantidad < 10000 && !/Total|Fecha|Contacto|Vendedor|Estado/i.test(nombre)) {
        items.push({ nombre, cantidad, precio: parsePrecio(m[3]) });
      }
    }
  }

  // Eliminar duplicados
  const vistos = new Set();
  return items.filter(item => {
    const k = item.nombre.toLowerCase();
    if (vistos.has(k)) return false;
    vistos.add(k); return true;
  });
}

function parsePrecio(str) {
  return parseInt(str.replace(/[.,\s]/g, '')) || 0;
}

// ════════════════════════════════════════════
// LÓGICA OCULTA — Calcular descuento (preview)
// ════════════════════════════════════════════
async function calcularDescuento(contenido, productosGuia) {
  const resultado = [];
  const items = parsearProductos(contenido, productosGuia);

  for (const item of items) {
    const matches = await buscarProducto(item.nombre);
    if (matches.length > 0) {
      const p = matches[0];
      resultado.push({
        sku: p.sku, nombre: p.nombre, categoria: p.categoria, color: p.color,
        cantidadActual: p.cantidad,
        cantidadDescontar: item.cantidad,
        cantidadResultante: Math.max(0, p.cantidad - item.cantidad),
        stockBajo: Math.max(0, p.cantidad - item.cantidad) <= p.minimo,
        encontrado: true
      });
    } else {
      resultado.push({ nombre:item.nombre, cantidadDescontar:item.cantidad, encontrado:false });
    }
  }
  return resultado;
}

// ════════════════════════════════════════════
// LÓGICA OCULTA — Ejecutar descuento real
// ════════════════════════════════════════════
async function ejecutarDescuento(contenido, productosGuia, guia) {
  const resultado = [];
  const items = parsearProductos(contenido, productosGuia);

  for (const item of items) {
    const matches = await buscarProducto(item.nombre);
    if (matches.length === 0) continue;
    const p = matches[0];
    const descontado = Math.min(p.cantidad, item.cantidad);
    if (dbConectada) {
      p.cantidad -= descontado; p.actualizadoEn = new Date(); await p.save();
      await Movimiento.create({ sku:p.sku, nombre:p.nombre, tipo:'salida', cantidad:descontado, motivo:'Guía: '+guia, guia });
    } else {
      if (memProductos[p.sku]) memProductos[p.sku].cantidad = Math.max(0, memProductos[p.sku].cantidad - descontado);
    }
    resultado.push({ sku:p.sku, nombre:p.nombre, descontado, restante:p.cantidad, stockBajo:p.cantidad<=p.minimo });
  }
  return resultado;
}

// Parsear productos del contenido de la guía
function parsearProductos(contenido, productosGuia) {
  const items = [];

  // Si la guía ya tiene productos parseados, usarlos
  if (productosGuia && productosGuia.length > 0) {
    return productosGuia.map(p => ({ nombre: p.nombre||p.sku||'', cantidad: p.cantidad||1 }));
  }

  // Si no, parsear desde el texto del contenido
  if (!contenido) return [];
  const partes = contenido.split('|');
  partes.forEach(parte => {
    const qm = parte.match(/x(\d+)$/i);
    const cant = qm ? parseInt(qm[1]) : 1;
    const nombre = parte.replace(/x\d+$/i,'').trim();
    if (nombre.length > 2) items.push({ nombre, cantidad:cant });
  });
  return items;
}

// Buscar producto por nombre usando keywords inteligentes
async function buscarProducto(nombreBusqueda) {
  if (!nombreBusqueda || nombreBusqueda.length < 3) return [];
  const busq = nombreBusqueda.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'') // quitar tildes
    .replace(/[^a-z0-9\s]/g,' ').trim();
  const terminos = busq.split(/\s+/).filter(t=>t.length>2);

  let todos = [];
  if (dbConectada) {
    todos = await Producto.find({});
  } else {
    todos = Object.values(memProductos);
  }

  // Función de puntaje — más alto = mejor match
  function puntaje(p) {
    const texto = (p.nombre+' '+(p.categoria||'')+' '+(p.color||'')).toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g,'');
    const kws = (p.keywords||[]).map(k => k.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''));

    let score = 0;

    // Bonus máximo: keyword exacta coincide con búsqueda completa
    if (kws.some(k => busq.includes(k) || k.includes(busq))) score += 100;

    // Bonus: cada término encontrado en nombre/color/categoria
    terminos.forEach(t => {
      if (texto.includes(t)) score += 10;
      if (kws.some(k => k.includes(t))) score += 15;
    });

    // Bonus especial: color coincide exactamente
    if (p.color) {
      const colorN = p.color.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
      if (busq.includes(colorN)) score += 50;
    }

    return score;
  }

  return todos
    .map(p => ({ p, score: puntaje(p) }))
    .filter(x => x.score >= 10)
    .sort((a,b) => b.score - a.score)
    .map(x => x.p);
}

// ════════════════════════════════════════════
// LÓGICA OCULTA — Extracción de código escaneado
// ════════════════════════════════════════════
function extraerCodigo(raw) {
  const s = raw.trim();
  const m1 = s.match(/\b(\d{9,13}\.\d{1,2})\b/); if (m1) return m1[1];
  if (/^\d{12,}$/.test(s)) {
    if (s.length===15&&s[0]==='7') return s.substring(1,12)+'.1';
    if (s.length>15) { const qr=s.match(/(36[34]\d{8})/); if(qr) return qr[1]+'.1'; }
    if (s[0]==='7'&&s.length>=12) return s.substring(1,12)+'.1';
    if (/^\d{10,13}$/.test(s)) return s;
  }
  const m2 = s.match(/GUIA[:\s#]{0,5}(\d{8,13}(?:\.\d{1,2})?)/i); if (m2) return m2[1];
  const m3 = s.match(/(\d{6,}(?:\.\d{1,2})?)/); if (m3) return m3[1];
  return s;
}

// ════════════════════════════════════════════
// LÓGICA OCULTA — Extracción desde PDF
// ════════════════════════════════════════════
function extraerDelPDF(text) {
  const map = {};
  let m;
  const re1 = /Nro:\s*\d+\s+Guia:\s*(\d{8,13}(?:\.\d{1,2})?)\s+Ciudad Destino:\s*([^\n\r]+?)\s+Valor/gi;
  while ((m=re1.exec(text))!==null) { if(!map[m[1]]) map[m[1]]={destino:m[2].trim(),contenido:'',productos:[]}; }
  const re1b = /Nro:\s*\d+\s+Guia:\s*(\d{8,13}(?:\.\d{1,2})?)/gi;
  while ((m=re1b.exec(text))!==null) { if(!map[m[1]]) map[m[1]]={destino:'',contenido:'',productos:[]}; }

  const blocks = text.split(/(?=GUIA:|(?=Durante el Dia\s+\d))/gi);
  blocks.forEach(block => {
    const gm = block.match(/GUIA:\s*[\r\n\s]*(\d{8,13}(?:\.\d{1,2})?)/i); if (!gm) return;
    const code = gm[1];
    if (!map[code]) map[code]={destino:'',contenido:'',productos:[]};
    const products=[], productosObj=[];

    // Coordinadora: * ID(XXXX)Nombre X qty
    const re2=/\*\s*ID\(\d+\)([^\n\r*]{4,100})/gi;
    while ((m=re2.exec(block))!==null) {
      const raw2=m[1].trim();
      const qm=raw2.match(/\s+X\s+(\d+)\s*$/i); const qty=qm?parseInt(qm[1]):1;
      const prod=raw2.replace(/\s+X\s+\d+\s*$/i,'').replace(/\$[\d.,]+/g,'').trim();
      if (prod.length>4&&prod.length<100&&!/envío?\s*prioritario/i.test(prod)) {
        products.push(prod+(qty>1?' x'+qty:'')); productosObj.push({nombre:prod,cantidad:qty});
      }
    }

    // Interrapidísimo
    if (products.length===0) {
      const sec=block.match(/#\s*PRODUCTO\s+CANT\s*([\s\S]+?)(?:www\.|Notas:|Powered|$)/i);
      if (sec) {
        sec[1].split(/[\n\r]+/).forEach(line=>{
          const l=line.trim();
          if(!l||/^\$/.test(l)||/^\d+(\s+\d+)?$/.test(l)||/^(PRODUCTO|CANT|#)$/i.test(l)||l.length<6) return;
          const clean=l.replace(/^\d+\s+/,'').replace(/\$[\d.,]+.*/g,'').trim();
          if(clean.length>5&&clean.length<120) { products.push(clean); productosObj.push({nombre:clean,cantidad:1}); }
        });
      }
    }

    const contenido=[...new Set(products)].slice(0,3).join(' | ');
    if(contenido&&!map[code].contenido) map[code].contenido=contenido;
    if(productosObj.length&&(!map[code].productos||!map[code].productos.length)) map[code].productos=productosObj;
  });

  const result={};
  Object.keys(map).forEach(code=>{
    const base=code.includes('.')?code.split('.')[0]:code;
    const dot=base+'.1'; const key=map[dot]?dot:code;
    if(!result[key]) result[key]={...map[code]};
    else { if(!result[key].destino&&map[code].destino) result[key].destino=map[code].destino; if(!result[key].contenido&&map[code].contenido) result[key].contenido=map[code].contenido; }
  });

  return Object.keys(result).map(code=>({code,...result[code]}));
}

function horaActual() { return new Date().toLocaleTimeString('es-CO',{hour:'2-digit',minute:'2-digit'}); }

conectarDB().then(ok=>{
  dbConectada=ok;
  app.listen(PORT,()=>console.log(`GuiaScan v3.0 en puerto ${PORT} | DB:${ok?'MongoDB':'Memoria'}`));
});
