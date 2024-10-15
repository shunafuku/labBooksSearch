import { fetchSparql } from './fetchSparql.js';

async function fetchTest() {
  const endpointUrl = 'https://lod.hozo.jp/fuseki/test/sparql';
  const query = `select*where{?s?p?o.}limit10`;

  return fetchSparql(endpointUrl, query);
}

async function fetchBookList(searchQuery) {
  const endpointUrl = `https://lod.hozo.jp/fuseki/labBook/sparql`;

  const query = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc:      <http://purl.org/dc/elements/1.1/>
    PREFIX dcndl: <http://ndl.go.jp/dcndl/terms/>
    SELECT DISTINCT ?book ?isbn ?title ?creators ?subject ?subjectLabel WHERE {
      {
        SELECT DISTINCT ?book (group_concat(distinct ?creator ; separator = ", ") AS ?creators) WHERE {
          #BIND(<http://hozo.jp/books/entity/9784501540104/1> as ?book)
          ?book rdfs:subClassOf <http://hozo.jp/books/class/book> .
          {
            ${searchQuery}
          }
          OPTIONAL{?book dc:creator ?creator .}
        }GROUP BY ?book
      }
      OPTIONAL{?book dcterms:identifier ?isbn .}
      OPTIONAL{?book dc:title/rdf:value ?title .}
      OPTIONAL{
        ?book dcterms:subject ?subject .
        ?subject foaf:name ?subjectLabel .
      }
      OPTIONAL{
        ?book dcterms:identifier ?isbn .
        filter(datatype(?isbn) = dcndl:ISBN)
      }
    }LIMIT 1000
  `;
  console.log('fetch start');
  return fetchSparql(endpointUrl, query);
}

function convertBookMapFromSparqlRes(res) {
  const books = new Map();
  // console.log('res');
  // console.log(res);
  res['results']['bindings'].forEach((element) => {
    // console.log('element');
    // console.log(element);
    const bookIri = element['book']['value'];
    const preBookInfo = books.get(bookIri);
    let bookInfo = new Map();
    if (typeof preBookInfo !== 'undefined') {
      bookInfo = preBookInfo;
      bookInfo
        .get('subjects')
        .set(element['subject']['value'], element['subjectLabel']['value']);
    } else {
      bookInfo.set('bookIri', element['book'] ? element['book']['value'] : '');
      bookInfo.set('title', element['title'] ? element['title']['value'] : '');
      bookInfo.set('isbn', element['isbn'] ? element['isbn']['value'] : '');
      bookInfo.set(
        'creators',
        element['creators'] ? element['creators']['value'] : ''
      );
      bookInfo.set(
        'subjects',
        new Map([
          [
            element['subject'] ? element['subject']['value'] : '',
            element['subject'] ? element['subjectLabel']['value'] : '',
          ],
        ])
      );
    }

    books.set(element['book']['value'], bookInfo);
  });
  return books;
}

async function search(searchQuery) {
  return await fetchBookList(searchQuery).then((res) => {
    console.log('sparql result received');
    console.log(res);
    const books = convertBookMapFromSparqlRes(res);
    console.log('books');
    console.log(books);

    return books;
  });
}

async function fetchSubjectList() {
  const endpointUrl = `https://lod.hozo.jp/fuseki/labBook/sparql`;
  const query = `
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dcterms: <http://purl.org/dc/terms/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX dc:      <http://purl.org/dc/elements/1.1/>
    PREFIX dcndl: <http://ndl.go.jp/dcndl/terms/>
    SELECT ?subject ?subjectLabel WHERE{
      {
        SELECT DISTINCT ?subject ?subjectLabel (COUNT(?subject) as ?c) WHERE {
          ?book rdfs:subClassOf <http://hozo.jp/books/class/book> .
          ?book dcterms:subject ?subject .
          ?subject foaf:name ?subjectLabel .
        }GROUP BY ?subject ?subjectLabel ORDER BY desc(?c)
      }
    }
  `;
  const sparqlRes = await fetchSparql(endpointUrl, query);
  const subjectMap = new Map(
    sparqlRes['results']['bindings'].map((res) => [
      res['subject']['value'],
      res['subjectLabel']['value'],
    ])
  );
  return subjectMap;
}
async function keywardSearch(keywards) {
  const createKeywardQuery = (keyward) => `
    {
    ?book dc:title/rdf:value ?title .
    FILTER(regex(?title, "${keyward}", "i"))
  }UNION{
    {
      SELECT DISTINCT ?book (group_concat(distinct ?creator ; separator = ", ") AS ?creators) WHERE {
        ?book dc:creator ?creator .
      }GROUP BY ?book
    }
    FILTER(regex(?creators, "${keyward}", "i"))
  }UNION{
    ?book dcterms:subject/foaf:name ?subjectLabel .
    FILTER(regex(?subjectLabel, "${keyward}", "i"))
  }`;
  const query = `
SELECT DISTINCT ?book WHERE{
${keywards.map((keyward) => createKeywardQuery(keyward)).join('')}
}
  `;
  return search(query);
}

async function advancedSearch(titleKeywards, creatorKeywards, subjectIri) {
  // title
  const needTitleQuery = titleKeywards.length > 0;
  console.log(titleKeywards);
  const titleFilterQuery = titleKeywards
    .map((title) => {
      console.log(title);
      return `FILTER(regex(?title, "${title}", "i"))`;
    })
    .join('');

  // creator
  const needCreatoreQuery = creatorKeywards.length > 0;
  console.log(titleKeywards);
  const creatorFilterQuery = creatorKeywards
    .map((creator) => {
      console.log(creator);
      return `FILTER(regex(?creators, "${creator}", "i"))`;
    })
    .join('');

  // subject
  const needSubjectQuery = subjectIri != '';

  let whereStr = '';
  if (needTitleQuery) {
    whereStr += `?book dc:title/rdf:value ?title . ${titleFilterQuery}`;
  }
  if (needCreatoreQuery) {
    whereStr += `{
      SELECT DISTINCT ?book (group_concat(distinct ?creator ; separator = ", ") AS ?creators) WHERE {
        ?book dc:creator ?creator .
      }GROUP BY ?book
    }
    ${creatorFilterQuery}`;
  }
  if (needSubjectQuery) {
    whereStr += `?book dcterms:subject <${subjectIri}>`;
  }
  const query = `SELECT DISTINCT ?book WHERE{
    ${whereStr}
  }`;
  console.log(needTitleQuery);
  console.log(titleFilterQuery);
  console.log(needCreatoreQuery);
  console.log(creatorFilterQuery);
  console.log(needSubjectQuery);
  console.log(query);

  return search(query);
}

export {
  fetchSubjectList,
  search,
  keywardSearch,
  advancedSearch,
  fetchBookList,
};
