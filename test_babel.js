const { transformFileSync } = require('/app/frontend/node_modules/@babel/core');
try {
  const r = transformFileSync('/app/frontend/src/pages/admin/AdminUsers.jsx', {
    presets: [['/app/frontend/node_modules/@babel/preset-env', {targets:{esmodules:true}}], '/app/frontend/node_modules/@babel/preset-react'],
    babelrc: false, configFile: false,
  });
  console.log('OK, output length:', r.code.length);
} catch(e) {
  console.log('ERR:', e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
}
