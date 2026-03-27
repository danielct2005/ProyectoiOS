/**
 * ===== API DE INDICADORES ECONÓMICOS =====
 * Serverless function para Vercel
 * Proxy que evita CORS entre el frontend y mindicador.cl
 */

export default async function handler(req, res) {
  // Configurar headers para CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Manejar preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const indicator = req.query.indicator || 'uf';
  const validIndicators = ['uf', 'dolar', 'euro', 'utm', 'ipc', 'variacion_ipc'];
  
  if (!validIndicators.includes(indicator)) {
    res.status(400).json({ error: 'Indicador inválido' });
    return;
  }

  try {
    // Fetch desde el servidor de Vercel (sin restricciones CORS)
    const response = await fetch(`https://mindicador.cl/api/${indicator}`, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Devolver solo el valor actual
    if (data && data.serie && data.serie.length > 0) {
      res.status(200).json({
        success: true,
        indicator: indicator,
        value: data.serie[0].valor,
        fecha: data.serie[0].fecha
      });
    } else {
      res.status(404).json({ error: 'Datos no disponibles' });
    }

  } catch (error) {
    console.error('Error fetching indicator:', error);
    res.status(500).json({ 
      error: 'Error al obtener indicador',
      details: error.message 
    });
  }
}
