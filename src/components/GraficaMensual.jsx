import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'


export default function GraficaMensual({ series }) {
// `series` es un array con objetos { label: '2023-JAN', ET: 4.2, YEAR, Month }
if (!series || series.length === 0) return (
<div className="p-4 text-sm text-gray-400">Selecciona un punto para ver la serie temporal.</div>
)


return (
<div className="w-full h-64 p-4 bg-slate-800/60 rounded-2xl shadow">
<h3 className="text-lg font-semibold mb-2">Serie de Evapotranspiración</h3>
<ResponsiveContainer width="100%" height="85%">
<LineChart data={series} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
<XAxis dataKey="label" tick={{ fontSize: 11 }} />
<YAxis />
<Tooltip formatter={(value) => value ? `${value.toFixed(2)} mm/día` : 'N/A'} />
<Line type="monotone" dataKey="ET" stroke="#60a5fa" dot={{ r: 3 }} />
</LineChart>
</ResponsiveContainer>
</div>
)
}