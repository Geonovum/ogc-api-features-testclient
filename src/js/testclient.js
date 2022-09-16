/*
  demo code, illustrating how access OGC Features API and OGC Records API could be done
  code is setup simple, for demo purposes

  NOTE: there is still some refactoring / nicer coding to do
*/

let _collectionsurl = apiurl + "/collections";
let _collectionId = "";
let _collections = {};
// TODO: implement limit in requests, use the /api doc for this
let _limit = 100;
let map;
let _apiCrses;
let bboxCrs;
let _baseLayer = {};

/*
  API handling
*/
// init: get the collections of the OGC API
function initAPI(apiurl) {
  $("#go").prop("disabled", true);
  $("#collections").html("");
  if (!apiurl) apiurl = $("#apiurl").val();

  // Access the API doc and try to process the collections resource
  $.getJSON(apiurl, function (apiSpec) {
    logUrl(apiurl)
    // TODO: process the limit, use the min value of the current default and the value of the API doc
    // For now: just save the api doc in a variable
    if (apiSpec["crs"]) {
      logTxt("Additional CRSes offered: " + apiSpec["crs"], "debug")
      _apiCrses = apiSpec["crs"];
    } else {
      logTxt("No other CRSes offered, default WGS84", "debug")
    }
    let _baseurl = apiurl.replace("/api", "");
    _baseurl = apiurl.replace("/openapi", "");
    // TODO: get the _collectionsurl from the openapi document
    _collectionsurl = _baseurl + "/collections";
    // get the collections of the API
    $.getJSON(_collectionsurl, function (collectionsResponse) {
      logUrl(_collectionsurl)
      let cnt = 0;
      for (let c in collectionsResponse["collections"]) {

        let collection = collectionsResponse["collections"][c];
        // id is required and not name as some (older?) implementations have as 'identifier'
        // let's support both
        let idKey = "id";
        if (!collection["id"] && collection["name"]) idKey = "name";
        let itemType = "feature";
        if (collection["itemType"]) {
          itemType = collection["itemType"];
        }

        let collectionId = _collectionsurl + "/" + collection[idKey];
        _collections[collectionId] = { "itemType": itemType, "internalid": collection[idKey] }
        // create the html for the list item with buttons
        let li = `<p id='li_${collection[idKey]}'><span class='badge ${itemType}'>${itemType}</span><b>${collection["title"] || collection[idKey]}</b><br/>${collection["description"] || ""}<br/><button onclick='loadItemsInExtent(\"${collection[idKey]}\", \"${itemType}\")'>Load items in current map view</button>&nbsp;<button onclick='addCollection(\"${collection[idKey]}\", \"${itemType}\")'>Browse items (random)</button></p>`;
        if (itemType == "record") {
          // we have records, show a button to open the search creen
          li += `<button onclick='$("#searchScreen").show();$("#collections").hide();_collectionId="${collectionId}";'>search</button>`;
        }
        $("#collections").append(li);
        cnt++;
      }
      $("#go").prop("disabled", false);
      $("#collections").prepend("<h2>" + cnt + " collections found</h2>");
    }).fail(function () {
      alert("Unfortunately, the collections endpoint at " + _collectionsurl + " can't be accessed.");
    });
  }).fail(function () {
    alert("Unfortunately, the url " + apiurl + " can't be accessed. Is it CORS enabled?");
  });
}

// load GeoJSON encoded data from a URL (in fact: from a collection URL)
// explicitly add the itemType here, could be easier if the record itself says it is a record (featureType maybe?)
function loadItems(reqUrl, collectionId, itemType) {
  // http://localhost:5000/collections/pc5/items/?&limit=100
  // callback for handling data?
  $.getJSON(reqUrl, function (data) {
    logUrl(reqUrl);
    if (data.features && itemType == "record") {
      createSearchResults(data, collectionId, itemType);
      $('#searchScreen').show();
      $('#collections').hide();
    } else {
      showOnMap(data, collectionId, itemType);
    }
    createPagingButtons(data, collectionId, itemType);
  });
}

function loadItemsInExtent(collectionId, itemType) {
  // TODO: take into account limit = -1? and/or paging?
  // assume limit= default of this demo for now
  _collectionId = collectionId;

  let reqUrl = _collectionsurl + "/" + collectionId + "/items?limit=" + _limit;
  const bnds = map.getBounds();
  let ll = [bnds["_southWest"].lng, bnds["_southWest"].lat];
  let ur = [bnds["_northEast"].lng, bnds["_northEast"].lat];
  // transform to RD, only RD is supported now
  if (bboxCrs) {
    reqUrl += "&bbox-crs=" + bboxCrs + "&crs=" + bboxCrs; // force RD as output?
    ll = transformToRD(ll);
    ur = transformToRD(ur);
  }
  let bboxStr = ll[0] + "," + ll[1] + "," + ur[0] + "," + ur[1];

  // API param: bbox
  reqUrl += "&bbox=" + bboxStr;
  loadItems(reqUrl, collectionId, itemType)
}

function searchRecordsAPI() {
  const q = $("#searchTerm").val();
  // add dataset or service?
  const collectionInfo = _collections[_collectionId];
  $("#browseButtons").html("");
  $("#searchResultsCounter").html("");
  // create the query URL
  // just add a higher limit
  let reqUrl = _collectionId + "/items?limit=" + _limit + "&q=" + q;
  loadItems(reqUrl, collectionInfo.internalid, collectionInfo.itemType);
}


// some UI functions and input handling
function setAPIurl(apiurl) {
  $("#apiurl").val(apiurl);
  $('#searchScreen').hide();
  $('#collections').show();
  initAPI(apiurl);
}

function addCollection(collectionId, itemType) {
  _collectionId = collectionId;
  let reqUrl = _collectionsurl + "/" + collectionId + "/items";
  loadItems(reqUrl, collectionId, itemType);
}

function logUrl(url) {
  $("#log").prepend(new Date().toUTCString() + " -> <a href='" + url + "' target='_blank'>" + url + "</a></br>");
}

function logTxt(txt, level) {
  $("#log").prepend("<span class='" + level + "'>" + new Date().toUTCString() + " -> " + txt + "</span></br>");
}

/*
 processing the data, visualizing on the map
*/
function initMap(crsAlias) {
  let options = {};
  // just to init the map proper
  if (crsAlias == 'RD') {
    // a let set in proj4util.js
    let RD = new L.Proj.CRS('EPSG:28992', '+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs',
      {
        resolutions: [3440.640, 1720.320, 860.160, 430.080, 215.040, 107.520, 53.760, 26.880, 13.440, 6.720, 3.360, 1.680, 0.840, 0.420],
        bounds: L.bounds([-285401.92, 22598.08], [595401.9199999999, 903401.9199999999]),
        origin: [-285401.92, 22598.08]
      }
    );
    options = {
      crs: RD,
      center: [52.1, 5.2], // in lat long
      zoom: 4,
    }
    _baseLayer = new L.tileLayer('https://geodata.nationaalgeoregister.nl/tms/1.0.0/brtachtergrondkaart/{z}/{x}/{y}.png', {
      minZoom: 0,
      maxZoom: 13,
      tms: true,
      attribution: 'Map data: <a href="http://www.kadaster.nl">Kadaster</a>'
    });
    bboxCrs = encodeURIComponent("http://www.opengis.net/def/crs/EPSG/0/28992");
  } else {
    options = {
      center: [52.1, 5.2],
      zoom: 7,
    }
    _baseLayer = new L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    });
  }
  // add gesture handling
  options.gestureHandling = true;

  map = new L.map('map', options);
  _baseLayer.addTo(map);
  map.fitBounds(map.getBounds());
  return map;
}

function clearMap() {
  map.eachLayer(function (layer) {
    if (layer != _baseLayer) {
      map.removeLayer(layer);
    }
  });
}

function showOnMap(data, collectionId, itemType) {
  let newLayer = L.geoJSON(data, {
    style: function (feature) {
      // very basic styling..
      return {
        color: "#0000bb"
      };
    }
  }).bindPopup(function (layer) {
    return createPopupContents(layer, collectionId, itemType);
  }, { maxWidth: 500 }).addTo(map);

  // for RD: back to WGS 84
  let newBnds = newLayer.getBounds();
  // TODO: transform back for BGT?
  if (bboxCrs) {
    let ll = [newBnds["_southWest"].lng, newBnds["_southWest"].lat];
    let ur = [newBnds["_northEast"].lng, newBnds["_northEast"].lat];
    // transform to RD, only RD is supported now
    ll = transformToWGS84(ll);
    ur = transformToWGS84(ur);
    newBnds = [ll, ur];
  }
  map.fitBounds(newBnds);

}

function createSearchResults(data, collectionId, itemType) {
  let list = [];
  $("#searchResults").html("");
  for (let i in data.features) {
    const ft = data.features[i];
    let title = ft.id;
    // we probably have a record
    if (ft.properties.title) {
      title = ft.properties.title;
    }
    // TODO: add button to add to map
    const addToMapButton = document.createElement("button");
    addToMapButton.className = "showonmap"
    addToMapButton.innerText = title;
    // add a button to display a single feature on the map
    $(addToMapButton).on("click", function () {
      showOnMap(ft, collectionId, itemType);
    })
    const li = document.createElement("li");
    li.append(addToMapButton);
    list.push(li);
  }
  $("#searchResults").append(list);
  $("#searchResultsCounter").html(data.numberMatched + " records found, showing " + list.length);
}

function createPopupContents(layer, collectionId, itemType) {
  // first determine the type of feature: regular or a specifc type, e.g. record
  let featureTitle = collectionId;
  // NOTE: a record has no indication it is a record, but we have to derive it from the properties
  let propertiesHandled = [];
  if (itemType == "record") {
    // mandatory properties: 
    featureTitle = layer.feature.properties["title"];
    propertiesHandled.push("title");
  }
  let pp = `<table class='fi'><th colspan='2'>${featureTitle}</td></th>`;
  for (let l in layer.feature.links) {
    let link = layer.feature.links[l];
    let title = "link";
    if (link.title) {
      title = link.title;
    }
    let linkType = "link";
    if (link.type) {
      linkType = link.type;
    }
    linkTypeBadge = `<span class='badge'>${linkType}</span>`;
    pp += `<tr><td>${linkTypeBadge}</td><td><a href='${link.href}' target='_blank'>${title}</a></td></tr>`;
  }
  for (let p in layer.feature.properties) {
    // in the array
    if (!propertiesHandled.includes(p)) {
      pp += "<tr><td>" + p + "</td><td> " + layer.feature.properties[p] + "</td></tr>";
    }
  }
  pp += "</table>";
  return pp;
}

/*
  paging through the response
*/
function createPagingButtons(data, collectionId, itemType) {
  // add the next and prev URLs if provided in the geojson response
  // TODO: add these buttons to the searchresults page too
  let buttonContainerId = "li_" + collectionId;
  if (itemType == "record") {
    buttonContainerId = "browseButtons";
  }
  if ($("#" + buttonContainerId)) {
    for (let l in data.links) {
      let lnk = data.links[l];
      if (lnk.rel == "next" || lnk.rel == "prev") {
        let btnId = "btn_" + lnk.rel + "_" + collectionId + "_" + itemType;
        let ttl = (lnk.title) ? lnk.title : lnk.rel;
        let btn = `<button id='${btnId}' onclick='pageItems(\"${lnk.href}\", \"${collectionId}\",\"${itemType}\")'>${ttl}</button>`;
        if ($("#" + btnId).length > 0) {
          $("#" + btnId).replaceWith(btn);
        } else {
          $("#" + buttonContainerId).append(btn);
        }
      }
    }
  }
}

function pageItems(reqUrl, collectionId, itemType) {
  loadItems(reqUrl, collectionId, itemType);
}
