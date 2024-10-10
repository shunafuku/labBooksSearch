import { fetchSparql } from './fetchSparql.js';

async function fetchTest() {
  const endpointUrl = 'https://lod.hozo.jp/fuseki/test/sparql';
  const query = `select*where{?s?p?o.}limit10`;

  return fetchSparql(endpointUrl, query);
}

async function fetchBookList(serachQuery) {
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
          #BIND(<https://hozo.jp/books/entity/9784501540104/1> as ?book)
          ?book rdfs:subClassOf <https://hozo.jp/books/class/book> .
          {
            ${serachQuery}
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

function createCardsHtml(books) {
  const articles = Array.from(books)
    .map(([key, value]) => {
      const bookImgUri = `https://ndlsearch.ndl.go.jp/thumbnail/${value.get(
        'isbn'
      )}.jpg`;
      const bookIconTamplate = `
    <article class="cell card">
      <div class="card-image">
        <figure class="image is-4by3 is-skeleton">
          <img
            src="${bookImgUri}"
            alt="${
              value.get('title') == ''
                ? value.get('title')
                : value.get('bookIri')
            }: 書影"
          />
        </figure>
      </div>
      <div class="card-content">
        <p class="title is-5">${
          value.get('title') != '' ? value.get('title') : value.get('bookIri')
        }</p>
        <p class="subtitle is-6">${value.get('creators')}</p>
        <div class="content is-size-7">
          ${Array.from(value.get('subjects'))
            .map(
              ([iri, label]) =>
                `<a href="${iri}" target="_blank" rel="noopener noreferrer">#${label}</a>`
            )
            .join(', ')}
        </div>
      </div>
    </article>
  `;
      return bookIconTamplate;
    })
    .join('');
  return articles;
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

async function serach(serachQuery) {
  await fetchBookList(serachQuery).then((res) => {
    console.log('sparql result received');
    console.log(res);
    const books = convertBookMapFromSparqlRes(res);
    console.log('books');
    console.log(books);

    //htmlを生成し、domに書き込み
    const articles = createCardsHtml(books);
    console.log('start write');
    document.getElementById('bookList').innerHTML = articles;
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
          ?book rdfs:subClassOf <https://hozo.jp/books/class/book> .
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

export { serach, fetchSubjectList };
