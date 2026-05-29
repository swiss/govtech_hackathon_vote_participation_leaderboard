const fs = require('fs');
const path = require('path');

async function fetchData() {
    const queryPath = path.join(__dirname, 'query.md');
    const sparqlQuery = fs.readFileSync(queryPath, 'utf8');

    // Remove LIMIT if present
    const cleanQuery = sparqlQuery.replace(/LIMIT\s+\d+/gi, '');

    const endpoint = 'https://ld.admin.ch/query';
    
    console.log(`Fetching data from ${endpoint}...`);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/sparql-query',
                'Accept': 'application/sparql-results+json'
            },
            body: cleanQuery
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        const outputFile = path.join(__dirname, 'query_results.json');
        fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        console.log(`Results saved to ${outputFile}`);
        
        // Transform data to the format used in frontend_v2/data.json if needed
        transformData(result);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function transformData(sparqlResult) {
    const bindings = sparqlResult.results.bindings;
    
    // Group by date
    const groupedByDate = {};
    
    // Canton mapping from URI to ID/Label and FederalCouncillor status
    // Standard FederalCouncillor values for the demo (matching data.json)
    const cantonMap = {
        'https://ld.admin.ch/canton/1': { id: 'ZH', label: 'Zürich', councillor: 1 },
        'https://ld.admin.ch/canton/2': { id: 'BE', label: 'Bern', councillor: 1 },
        'https://ld.admin.ch/canton/3': { id: 'LU', label: 'Luzern', councillor: 0 },
        'https://ld.admin.ch/canton/4': { id: 'UR', label: 'Uri', councillor: 0 },
        'https://ld.admin.ch/canton/5': { id: 'SZ', label: 'Schwyz', councillor: 0 },
        'https://ld.admin.ch/canton/6': { id: 'OW', label: 'Obwalden', councillor: 0 },
        'https://ld.admin.ch/canton/7': { id: 'NW', label: 'Nidwalden', councillor: 0 },
        'https://ld.admin.ch/canton/8': { id: 'GL', label: 'Glarus', councillor: 0 },
        'https://ld.admin.ch/canton/9': { id: 'ZG', label: 'Zug', councillor: 0 },
        'https://ld.admin.ch/canton/10': { id: 'FR', label: 'Freiburg', councillor: 1 },
        'https://ld.admin.ch/canton/11': { id: 'SO', label: 'Solothurn', councillor: 0 },
        'https://ld.admin.ch/canton/12': { id: 'BS', label: 'Basel-Stadt', councillor: 1 },
        'https://ld.admin.ch/canton/13': { id: 'BL', label: 'Basel-Landschaft', councillor: 0 },
        'https://ld.admin.ch/canton/14': { id: 'SH', label: 'Schaffhausen', councillor: 0 },
        'https://ld.admin.ch/canton/15': { id: 'AR', label: 'Appenzell Ausserrhoden', councillor: 0 },
        'https://ld.admin.ch/canton/16': { id: 'AI', label: 'Appenzell Innerrhoden', councillor: 0 },
        'https://ld.admin.ch/canton/17': { id: 'SG', label: 'St. Gallen', councillor: 1 },
        'https://ld.admin.ch/canton/18': { id: 'GR', label: 'Graubünden', councillor: 0 },
        'https://ld.admin.ch/canton/19': { id: 'AG', label: 'Aargau', councillor: 0 },
        'https://ld.admin.ch/canton/20': { id: 'TG', label: 'Thurgau', councillor: 0 },
        'https://ld.admin.ch/canton/21': { id: 'TI', label: 'Tessin', councillor: 1 },
        'https://ld.admin.ch/canton/22': { id: 'VD', label: 'Waadt', councillor: 1 },
        'https://ld.admin.ch/canton/23': { id: 'VS', label: 'Wallis', councillor: 1 },
        'https://ld.admin.ch/canton/24': { id: 'NE', label: 'Neuenburg', councillor: 0 },
        'https://ld.admin.ch/canton/25': { id: 'GE', label: 'Genf', councillor: 0 },
        'https://ld.admin.ch/canton/26': { id: 'JU', label: 'Jura', councillor: 0 }
    };

    bindings.forEach(b => {
        if (!b.date || !b.region || !b.participation) {
            console.warn('Skipping incomplete binding:', b);
            return;
        }
        const date = b.date.value;
        const regionUri = b.region.value;
        const participation = parseFloat(b.participation.value);
        
        if (!groupedByDate[date]) {
            groupedByDate[date] = {
                id: `${date}-vote`,
                date: date,
                title: `Popular Vote on ${date}`,
                cantons: []
            };
        }
        
        const cantonInfo = cantonMap[regionUri] || { id: regionUri.split('/').pop(), label: regionUri.split('/').pop(), councillor: 0 };
        
        groupedByDate[date].cantons.push({
            id: cantonInfo.id,
            label: cantonInfo.label,
            value: participation,
            FederalCouncillor: cantonInfo.councillor
        });
    });
    
    const finalData = Object.values(groupedByDate).sort((a, b) => a.date.localeCompare(b.date));
    const transformedFile = path.join(__dirname, 'transformed_data.json');
    fs.writeFileSync(transformedFile, JSON.stringify(finalData, null, 2));
    console.log(`Transformed data saved to ${transformedFile}`);

    // Also copy to frontend_v2/data.json for immediate use if requested
    const frontendDataFile = path.join(__dirname, '..', 'frontend_v2', 'data.json');
    try {
        fs.writeFileSync(frontendDataFile, JSON.stringify(finalData, null, 2));
        console.log(`Data also saved to ${frontendDataFile}`);
    } catch (e) {
        console.warn(`Could not save to ${frontendDataFile}: ${e.message}`);
    }
}

fetchData();
