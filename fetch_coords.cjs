const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json', (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
        try {
            // Remove BOM if present
            if (rawData.charCodeAt(0) === 0xFEFF) {
                rawData = rawData.slice(1);
            }
            const parsedData = JSON.parse(rawData);
            const spCities = parsedData.filter(c => c.codigo_uf === 35).map(c => ({
                name: c.nome.toUpperCase(),
                lat: c.latitude,
                lon: c.longitude
            }));
            fs.writeFileSync('src/sp_cities.json', JSON.stringify(spCities, null, 2));
            console.log('Finished writing src/sp_cities.json');
        } catch (e) {
            console.error(e.message);
        }
    });
});
