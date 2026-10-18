export default async function vercelHandler(req,res) {
  try {
    const {handler}=await import('../server.mjs');
    return handler(req,res);
  } catch(error) {
    console.error('EVITA initialization failed:',error.message);
    res.statusCode=503;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    res.end(JSON.stringify({error:'Aplikasi belum siap. Periksa konfigurasi database dan akun awal di pengaturan deployment.'}));
  }
}
