export async function fetchSparql(endpointUrl, sparqlQuery) {
  const fullUrl = endpointUrl + "?query=" + encodeURIComponent(sparqlQuery);
  const headers = {
    Accept: "application/sparql-results+json",
  };
  return fetch(fullUrl, { headers, method: "GET", mode: "cors" })
    .then((response) => {
      if (!response.ok) {
        console.error("サーバーエラー");
      }
      return response.json();
    })
    .catch((error) => {
      console.error("通信に失敗しました", error);
    });
}
