import { fetchSparql } from './fetchSparql.js';

export async function fetchTest() {
  const endpointUrl = 'https://lod.hozo.jp/fuseki/test/sparql';
  const query = `select*where{?s?p?o.}limit10`;

  return fetchSparql(endpointUrl, query);
}

export async function fetchBookList() {
  const endpointUrl = `https://lod.hozo.jp/kz-fuseki/lab'sBooks/query`;
  const query = `
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc:      <http://purl.org/dc/elements/1.1/>
    PREFIX dcndl: <http://ndl.go.jp/dcndl/terms/>
    SELECT DISTINCT * WHERE {
      #BIND(<https://hozo.jp/books/entity/9784274202926/1> as ?book)
      ?book dc:title/rdf:value ?title ;
          dcterms:identifier ?isbn .
      filter(datatype(?isbn) = dcndl:ISBN)
    }LIMIT 10
  `;
  console.log('fetch start');
  return fetchSparql(endpointUrl, query);
}
