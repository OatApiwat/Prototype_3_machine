module.exports = {
  flowFile: 'flows.json',
  uiPort: process.env.PORT || 1880,
  functionExternalModules: true,
  functionGlobalContext: {
    genMddp: require('/data/sim/gen_mddp.js')
  },
  logging: { console: { level: 'info', metrics: false, audit: false } }
};
