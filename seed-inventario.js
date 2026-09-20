// ═══════════════════════════════════════════════════════
// seed-inventario.js — Carga inicial del inventario
// Ejecutar UNA sola vez: node seed-inventario.js
// ═══════════════════════════════════════════════════════
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || '';
if (!MONGO_URI) { console.error('❌ Define MONGO_URI'); process.exit(1); }

const ProductoSchema = new mongoose.Schema({
  sku: { type: String, required: true, unique: true },
  nombre: { type: String, required: true },
  categoria: { type: String, default: '' },
  color: { type: String, default: '' },
  cantidad: { type: Number, default: 0 },
  unidadMin: { type: Number, default: 3 },
  keywords: [String], // palabras para matching con PDF
  actualizadoEn: { type: Date, default: Date.now }
});

const Producto = mongoose.model('Producto', ProductoSchema);

const productos = [
  // ── ABRIGOS SIN VARIANTE DE COLOR ──
  { sku:'ABR-VIRGEN-CARMEN',    nombre:'Abrigo Virgen del Carmen',       categoria:'Abrigos',  cantidad:34,  keywords:['virgen del carmen','virgen carmen'] },
  { sku:'ABR-BRAHMAN-UNICO',    nombre:'Abrigo Brahmán Único',           categoria:'Abrigos',  cantidad:8,   keywords:['brahman unico','brahmán único','brahman único'] },
  { sku:'ABR-DIVINO-NINO',      nombre:'Abrigo Divino Niño',             categoria:'Abrigos',  cantidad:90,  keywords:['divino niño','divino nino'] },
  { sku:'ABR-DIA-PADRE',        nombre:'Día del Padre Potro',            categoria:'Abrigos',  cantidad:23,  keywords:['dia del padre','potro'] },
  { sku:'ABR-MANTA-RAFAEL',     nombre:'Manta San Rafael',               categoria:'Abrigos',  cantidad:22,  keywords:['san rafael','manta san rafael'] },
  { sku:'ABR-SAN-JOSE',         nombre:'Abrigo San José',                categoria:'Abrigos',  cantidad:6,   keywords:['san jose','san josé'] },
  { sku:'ABR-MILAGROSA',        nombre:'Abrigo Virgen de la Milagrosa',  categoria:'Abrigos',  cantidad:19,  keywords:['milagrosa','virgen milagrosa'] },
  { sku:'ABR-GUADALUPE',        nombre:'Abrigo Virgen Guadalupe',        categoria:'Abrigos',  cantidad:18,  keywords:['guadalupe','virgen guadalupe'] },
  { sku:'ABR-VIRGEN-CARMEN-NVO',nombre:'Abrigo Virgen del Carmen Nuevo', categoria:'Abrigos',  cantidad:39,  keywords:['virgen del carmen nuevo','carmen nuevo'] },
  { sku:'ABR-ROSA-MISTICA',     nombre:'Abrigo Rosa Mística',            categoria:'Abrigos',  cantidad:8,   keywords:['rosa mistica','rosa mística'] },
  // ── MANTOS ──
  { sku:'MANTO-SAGRADO',        nombre:'Manto Sagrado Corazón de Jesús', categoria:'Mantos',   cantidad:0,   keywords:['sagrado corazon','sagrado corazón','corazon de jesus'] },
  { sku:'MANTO-FATIMA',         nombre:'Manto Virgen de Fátima',         categoria:'Mantos',   cantidad:54,  keywords:['fatima','fátima','virgen fatima'] },
  { sku:'MANTO-CHAL',           nombre:'Manto Tipo Chal',                categoria:'Mantos',   cantidad:2,   keywords:['tipo chal','manto chal'] },
  { sku:'MANTO-ESPIRITU',       nombre:'Manto Espíritu Santo',           categoria:'Mantos',   cantidad:0,   keywords:['espiritu santo','espíritu santo'] },
  { sku:'MANTO-EDEN',           nombre:'Manto Edén',                     categoria:'Mantos',   cantidad:64,  keywords:['eden','edén','manto eden'] },
  // ── ABRIGOS CON COLOR ──
  { sku:'ABR-TEJIDO-BLC',   nombre:'Abrigo Tejido Blanco',    categoria:'Abrigos', color:'Blanco',    cantidad:9,  keywords:['abrigo tejido','tejido blanco','tejido talla'] },
  { sku:'ABR-TEJIDO-NGR',   nombre:'Abrigo Tejido Negro',     categoria:'Abrigos', color:'Negro',     cantidad:16, keywords:['abrigo tejido negro','tejido negro'] },
  { sku:'ABR-TEJIDO-RSD',   nombre:'Abrigo Tejido Rosado',    categoria:'Abrigos', color:'Rosado',    cantidad:22, keywords:['abrigo tejido rosado','tejido rosado'] },
  { sku:'CUELLO-CAM-NGR',   nombre:'Cuello Camisero Negro',   categoria:'Abrigos', color:'Negro',     cantidad:0,  keywords:['cuello camisero negro','camisero negro'] },
  { sku:'CUELLO-CAM-CAF',   nombre:'Cuello Camisero Café',    categoria:'Abrigos', color:'Café',      cantidad:1,  keywords:['cuello camisero cafe','camisero cafe','camisero café'] },
  { sku:'CUELLO-CAM-BEI',   nombre:'Cuello Camisero Beige',   categoria:'Abrigos', color:'Beige',     cantidad:1,  keywords:['cuello camisero beige','camisero beige'] },
  { sku:'POLAR-DAMA-VNT',   nombre:'Polar Dama Vinotinto',    categoria:'Abrigos', color:'Vinotinto', cantidad:32, keywords:['polar dama vinotinto','polar vinotinto','polar para dama vinotinto'] },
  { sku:'POLAR-DAMA-MRF',   nombre:'Polar Dama Marfil',       categoria:'Abrigos', color:'Marfil',    cantidad:17, keywords:['polar dama marfil','polar marfil','polar para dama marfil'] },
  { sku:'POLAR-DAMA-CAF',   nombre:'Polar Dama Café',         categoria:'Abrigos', color:'Café',      cantidad:10, keywords:['polar dama cafe','polar cafe','polar para dama cafe'] },
  { sku:'BRAHAM-BRD-BLC',   nombre:'Braham Bordado Blanco',   categoria:'Abrigos', color:'Blanco',    cantidad:4,  keywords:['braham bordado blanco','braham blanco','brahman bordado blanco'] },
  { sku:'BRAHAM-BRD-NGR',   nombre:'Braham Bordado Negro',    categoria:'Abrigos', color:'Negro',     cantidad:9,  keywords:['braham bordado negro','braham negro'] },
  { sku:'BRAHAM-BRD-CAF',   nombre:'Braham Bordado Café',     categoria:'Abrigos', color:'Café',      cantidad:1,  keywords:['braham bordado cafe','braham cafe'] },
  { sku:'ABR-ENCANTO-BLC',  nombre:'Abrigo Encanto Blanco',   categoria:'Abrigos', color:'Blanco',    cantidad:0,  keywords:['abrigo encanto blanco','encanto blanco'] },
  { sku:'ABR-ENCANTO-NGR',  nombre:'Abrigo Encanto Negro',    categoria:'Abrigos', color:'Negro',     cantidad:0,  keywords:['abrigo encanto negro','encanto negro'] },
  { sku:'ABR-ENCANTO-RSD',  nombre:'Abrigo Encanto Rosado',   categoria:'Abrigos', color:'Rosado',    cantidad:0,  keywords:['abrigo encanto rosado','encanto rosado'] },
  { sku:'ORIGEN-BEI',       nombre:'Origen Beige',            categoria:'Abrigos', color:'Beige',     cantidad:0,  keywords:['origen beige'] },
  { sku:'ORIGEN-NGR',       nombre:'Origen Negro',            categoria:'Abrigos', color:'Negro',     cantidad:0,  keywords:['origen negro'] },
  { sku:'ORIGEN-CAF',       nombre:'Origen Café',             categoria:'Abrigos', color:'Café',      cantidad:0,  keywords:['origen cafe','origen café'] },
  { sku:'ORIGEN-GRS',       nombre:'Origen Gris',             categoria:'Abrigos', color:'Gris',      cantidad:0,  keywords:['origen gris'] },
  // ── PVC ──
  { sku:'PVC-1M',    nombre:'PVC 1 Metro',    categoria:'PVC', cantidad:69, unidadMin:5, keywords:['pvc 1 metro','pvc 1m','protector pvc 1 metro','1 metro x 1.5','1m x'] },
  { sku:'PVC-1.5M',  nombre:'PVC 1.5 Metros', categoria:'PVC', cantidad:15, unidadMin:5, keywords:['pvc 1.5','pvc 1,5','1.5 metros','protector pvc 1.5','1.5m'] },
  { sku:'PVC-2M',    nombre:'PVC 2 Metros',   categoria:'PVC', cantidad:18, unidadMin:5, keywords:['pvc 2 metros','pvc 2m','protector pvc 2 metros','2 metros x 1.5','2m x'] },
  // ── MANTELES 2.2 - 6 PUESTOS ──
  { sku:'MNT-22-ORO', nombre:'Mantel 2.2 6P Oro',      categoria:'Manteles', color:'Oro',      cantidad:14, keywords:['mantel oro','mantel 6 puestos oro','mantel 2.2 oro'] },
  { sku:'MNT-22-RSA', nombre:'Mantel 2.2 6P Rosa',     categoria:'Manteles', color:'Rosa',     cantidad:11, keywords:['mantel rosa','mantel 6 puestos rosa'] },
  { sku:'MNT-22-ENC', nombre:'Mantel 2.2 6P Encanto',  categoria:'Manteles', color:'Encanto',  cantidad:8,  keywords:['mantel encanto','mantel 6 puestos encanto'] },
  { sku:'MNT-22-IMP', nombre:'Mantel 2.2 6P Imperial', categoria:'Manteles', color:'Imperial', cantidad:0,  keywords:['mantel imperial','mantel 6 puestos imperial'] },
  { sku:'MNT-22-PLA', nombre:'Mantel 2.2 6P Plateado', categoria:'Manteles', color:'Plateado', cantidad:8,  keywords:['mantel plateado','mantel 6 puestos plateado'] },
  { sku:'MNT-22-FLR', nombre:'Mantel 2.2 6P Florenza', categoria:'Manteles', color:'Florenza', cantidad:0,  keywords:['mantel florenza','mantel 6 puestos florenza'] },
  // ── MANTELES 1.8 - 4 PUESTOS ──
  { sku:'MNT-18-ORO', nombre:'Mantel 1.8 4P Oro',      categoria:'Manteles', color:'Oro',      cantidad:5,  keywords:['mantel 4 puestos oro','mantel 1.8 oro'] },
  { sku:'MNT-18-RSA', nombre:'Mantel 1.8 4P Rosa',     categoria:'Manteles', color:'Rosa',     cantidad:10, keywords:['mantel 4 puestos rosa','mantel 1.8 rosa'] },
  { sku:'MNT-18-ENC', nombre:'Mantel 1.8 4P Encanto',  categoria:'Manteles', color:'Encanto',  cantidad:11, keywords:['mantel 4 puestos encanto','mantel 1.8 encanto'] },
  { sku:'MNT-18-IMP', nombre:'Mantel 1.8 4P Imperial', categoria:'Manteles', color:'Imperial', cantidad:0,  keywords:['mantel 4 puestos imperial','mantel 1.8 imperial'] },
  { sku:'MNT-18-PLA', nombre:'Mantel 1.8 4P Plateado', categoria:'Manteles', color:'Plateado', cantidad:4,  keywords:['mantel 4 puestos plateado','mantel 1.8 plateado'] },
  { sku:'MNT-18-FLR', nombre:'Mantel 1.8 4P Florenza', categoria:'Manteles', color:'Florenza', cantidad:3,  keywords:['mantel 4 puestos florenza','mantel 1.8 florenza'] },
  // ── TENDEDEROS Y KIT ──
  { sku:'TENDEDERO',     nombre:'Tendedero',          categoria:'Otros', cantidad:248, unidadMin:10, keywords:['tendedero'] },
  { sku:'KIT-REPARACION',nombre:'Kit de Reparación',  categoria:'Otros', cantidad:13,  unidadMin:2,  keywords:['kit de reparacion','kit reparacion','kit'] },
  // ── INSUMOS ──
  { sku:'INS-ROLLO-IMP',  nombre:'Rollo Impresión x500',    categoria:'Insumos', cantidad:8,  unidadMin:2, keywords:['rollo impresion','rollos de impresion'] },
  { sku:'INS-RIBON',      nombre:'Ribón',                   categoria:'Insumos', cantidad:5,  unidadMin:1, keywords:['ribon','ribbon'] },
  { sku:'INS-CINTAS',     nombre:'Cintas',                  categoria:'Insumos', cantidad:1,  unidadMin:1, keywords:['cintas','cinta'] },
  { sku:'INS-STR-GRD',    nombre:'Stretch Grande 45cm',     categoria:'Insumos', cantidad:7,  unidadMin:2, keywords:['stretch grande','stretch 45'] },
  { sku:'INS-STR-PEQ',    nombre:'Stretch Pequeño 30cm',    categoria:'Insumos', cantidad:11, unidadMin:2, keywords:['stretch pequeño','stretch 30','stretch peq'] },
  { sku:'INS-BOLSA-GRD',  nombre:'Bolsa Grande 18x24',      categoria:'Insumos', cantidad:1,  unidadMin:1, keywords:['bolsa grande','bolsa 18x24'] },
  { sku:'INS-BOLSA-MED',  nombre:'Bolsa Mediana 14x18',     categoria:'Insumos', cantidad:1,  unidadMin:1, keywords:['bolsa mediana','bolsa 14x18'] },
  { sku:'INS-BOLSA-PEQ',  nombre:'Bolsa Pequeña',           categoria:'Insumos', cantidad:1,  unidadMin:1, keywords:['bolsa pequeña','bolsa peq'] },
  // ── ROLLOS PVC ──
  { sku:'ROLLO-PVC-30M',  nombre:'Rollo PVC 30M',  categoria:'Rollos PVC',     cantidad:0, unidadMin:1, keywords:['rollo pvc 30','rollo 30m'] },
  { sku:'ROLLO-PVC-40M',  nombre:'Rollo PVC 40M',  categoria:'Rollos PVC',     cantidad:4, unidadMin:1, keywords:['rollo pvc 40','rollo 40m'] },
  // ── ROLLOS MANTEL ──
  { sku:'ROLLO-MNT-ORO',  nombre:'Rollo Mantel Oro',      categoria:'Rollos Mantel', color:'Oro',      cantidad:2, unidadMin:1, keywords:['rollo mantel oro'] },
  { sku:'ROLLO-MNT-RSA',  nombre:'Rollo Mantel Rosa',     categoria:'Rollos Mantel', color:'Rosa',     cantidad:3, unidadMin:1, keywords:['rollo mantel rosa'] },
  { sku:'ROLLO-MNT-ENC',  nombre:'Rollo Mantel Encanto',  categoria:'Rollos Mantel', color:'Encanto',  cantidad:4, unidadMin:1, keywords:['rollo mantel encanto'] },
  { sku:'ROLLO-MNT-IMP',  nombre:'Rollo Mantel Imperial', categoria:'Rollos Mantel', color:'Imperial', cantidad:0, unidadMin:1, keywords:['rollo mantel imperial'] },
  { sku:'ROLLO-MNT-PLA',  nombre:'Rollo Mantel Plateado', categoria:'Rollos Mantel', color:'Plateado', cantidad:0, unidadMin:1, keywords:['rollo mantel plateado'] },
  { sku:'ROLLO-MNT-FLR',  nombre:'Rollo Mantel Florenza', categoria:'Rollos Mantel', color:'Florenza', cantidad:0, unidadMin:1, keywords:['rollo mantel florenza'] },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Conectado a MongoDB');
  let creados = 0, actualizados = 0;
  for (const p of productos) {
    const existe = await Producto.findOne({ sku: p.sku });
    if (existe) {
      await Producto.updateOne({ sku: p.sku }, { $set: { ...p, actualizadoEn: new Date() } });
      actualizados++;
    } else {
      await Producto.create(p);
      creados++;
    }
  }
  console.log(`✅ ${creados} productos creados, ${actualizados} actualizados`);
  console.log(`✅ Total: ${productos.length} productos en inventario`);
  await mongoose.disconnect();
}

seed().catch(err => { console.error('❌ Error:', err); process.exit(1); });
