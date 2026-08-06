/* =========================================================
   Luque & Merino — Configuración de Supabase
   ---------------------------------------------------------
   La "publishable key" es PÚBLICA y segura de exponer en el
   navegador. La seguridad real la dan las políticas (RLS) de
   la base de datos: el público solo puede LEER el catálogo;
   solo un usuario con sesión (tú) puede modificarlo.
   ========================================================= */
window.LYM_SUPABASE = {
  url: "https://fktuaqazgshutykbrxob.supabase.co",
  key: "sb_publishable_0TBUrSuWHJudLWYTgRFElg_pGWHMNUs",
  table: "lym_products"
};

/* Nombres bonitos de cada categoría (para las etiquetas) */
window.LYM_CATEGORIES = {
  "textil": "Textil hogar",
  "cortinas": "Cortinas y estores",
  "cama-infantil": "Cama infantil",
  "colchon": "Protección colchón",
  "bebe": "Bebé"
};

/* Ilustraciones disponibles (mientras no haya fotos reales) */
window.LYM_IMAGES = [
  "cama.svg", "toallas.svg", "albornoz.svg", "mantelerias.svg",
  "cortinas.svg", "cuna.svg", "colchon.svg", "bebe.svg", "bordado.svg"
];
