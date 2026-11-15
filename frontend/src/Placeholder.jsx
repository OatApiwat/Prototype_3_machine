import React from 'react';
export default function Placeholder({ name }) {
  return <div><h1>{name}</h1><div className="card nodata">The {name} simulator flow in Node-RED and this tab are being ported next. Nothing is generated in the browser.</div></div>;
}
