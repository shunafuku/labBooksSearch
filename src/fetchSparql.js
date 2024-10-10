export async function fetchSparql(endpointUrl, sparqlQuery) {
  const fullUrl = endpointUrl + '?query=' + encodeURIComponent(sparqlQuery);
  const headers = {
    Accept: 'application/sparql-results+json',
  };
  console.log('fullURL');
  console.log(fullUrl);
  return fetch(fullUrl, { headers, method: 'GET', mode: 'cors' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .catch((error) => {
      console.error('通信に失敗しました', error);
    });
}
