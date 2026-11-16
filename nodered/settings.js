module.exports = {
  flowFile: 'flows.json',
  uiPort: process.env.PORT || 1880,
  functionExternalModules: true,
  functionGlobalContext: {
    sim: require('/data/sim/index.js')
  },
  logging: { console: { level: 'info', metrics: false, audit: false } }
};
