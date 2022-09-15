let _apiDoc;
let _apiCrses;
let _baseurl = ""
let _collectionsurl = apiurl + "/collections";
let _collectionId = "";
let _collections = []
// TODO: implement limit in requests, use the /api doc for this
let _limit = 100;
let map;
let bboxCrs;
let _baseLayer = {};

function initMap(crsAlias) {
  let options = {};
  // just to init the map proper
  if (crsAlias=='RD') {
    // a let set in proj4util.js
    let RD = new L.Proj.CRS( 'EPSG:28992','+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs',
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
    bboxCrs=encodeURIComponent("http://www.opengis.net/def/crs/EPSG/0/28992");
  } else {
    options = {
      center: [52.1, 5.2],
      zoom: 9,
    }
    _baseLayer = new L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
  }

  map = new L.map('map', options);
  _baseLayer.addTo(map);
  map.fitBounds(map.getBounds());
  return map;
}

function logUrl(url) {
  $("#log").prepend(new Date().toUTCString() + " -> <a href='"+url+"' target='_blank'>" + url + "</a></br>");
}

function logTxt(txt, level) {
  $("#log").prepend("<span class='"+level+"'>" + new Date().toUTCString() + " -> " + txt + "</span></br>");
}

function setAPIurl(apiurl) {
  $("#apiurl").val(apiurl);
  initAPI(apiurl);
}

// init: get the collections of the WFS3 API
function initAPI(apiurl) {
  $("#go").prop("disabled", true);
  if (!apiurl) apiurl = $("#apiurl").val();
  $("#collections").html("")
  // Access the API doc and try to process the collections resource
  $.getJSON(apiurl, function(data) {
    logUrl(apiurl)
    // TODO: process the limit, use the min value of the current default and the value of the API doc
    // For now: just save the api doc in a variable
    _apiDoc = data;
    if (_apiDoc["crs"]) {
      logTxt("Additional CRSes offered: " + _apiDoc["crs"], "debug")
      _apiCrses = _apiDoc["crs"];
    } else {
      logTxt("No other CRSes offered, default WGS84", "debug")
    }
    _baseurl = apiurl.replace("/api", "")
    _baseurl = apiurl.replace("/openapi", "")
    _collectionsurl = _baseurl + "/collections"
    // TODO: get the _collectionsurl from the openapi document
    
    // get the collections of the WFS 3 API
    $.getJSON(_collectionsurl, function(colldata) {
      logUrl(_collectionsurl)
      let cnt = 0;
      for (let c in colldata["collections"]) {
        let coll = colldata["collections"][c];
        // id is required (not name as some implementations have)
        // to be relaxed: support both
        let idKey = "id";
        if (!coll["id"] && coll["name"] ) idKey = "name";
        let itemType = "feature";
        if (coll["itemType"]) {
          itemType = coll["itemType"];
        }
        
        const li = "<p id='li_" + coll[idKey] + "'>" + "<span class='badge "+itemType+"'>" + itemType + "</span>" +
          "<b>" + (coll["title"] || coll[idKey]) + "</b><br/>" + (coll["description"] || "") +
          "<br/><button onclick='loadDataInExtent(\"" + coll[idKey] + "\", \""+ itemType + "\")'>Load items in current map view</button>&nbsp;<button onclick='addCollection(\"" + coll[idKey] + "\", \""+ itemType + "\")'>Browse items (random)</button></p>";
        $("#collections").append(li);
        cnt++;
      }
      $("#go").prop("disabled", false);
      $("#collections").prepend("<h2>" + cnt + " collections found</h2>");
    });
  });
}

function clearMap() {
  map.eachLayer(function (layer){
    if (layer != _baseLayer) {
      map.removeLayer(layer);
    }
  });
}

function loadDataInExtent(collectionId, itemType) {
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
  reqUrl += "&bbox=" + bboxStr;
  loadData(reqUrl, collectionId, itemType)
}

function nextData(reqUrl, collectionId, itemType) {
  // TODO: remove previous data?
  loadData(reqUrl, collectionId, itemType);
}

function addCollection(collectionId, itemType) {
  _collectionId = collectionId;
  let reqUrl = _collectionsurl + "/" + collectionId + "/items";
  loadData(reqUrl, collectionId, itemType);
}

// load GeoJSON encoded data from a URL (in fact: from a collection URL)
// explicitly add the itemType here, could be easier if the record itself says it is a record (featureType maybe?)
function loadData(reqUrl, collectionId, itemType) {
  // http://localhost:5000/collections/pc5/items/?&limit=100
  $.getJSON(reqUrl, function(data) {
    logUrl(reqUrl);
    let newLayer = L.geoJSON(data, {
      style: function(feature) {
        // very basic styling..
        return {
          color: "#0000bb"
        };
      }
    }).bindPopup(function(layer) {
      // first determine the type of feature: regular or a specifc type, e.g. record
      let featureTitle = collectionId;
      // NOTE: a record has no indication it is a record, but we have to derive it from the properties
      let propertiesHandled = [];
      if (itemType == "record") {
        // mandatory properties: 
        featureTitle = layer.feature.properties["title"];
        propertiesHandled.push("title");

      }
      let pp = "<table class='fi'><th colspan='2'>" + featureTitle + "</td></th>";      
      for (let p in layer.feature.properties) {
        // in the array
        if (!propertiesHandled.includes(p)) {
          pp += "<tr><td>" + p + "</td><td> " + layer.feature.properties[p] + "</td></tr>";
        }
      }
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
        linkTypeBadge = "<span class='badge'>" + linkType + "</span>";
        pp += "<tr><td>" + linkTypeBadge + "</td><td><a href='"+ link.href +"' target='_blank'>"+ title +"</a></td></tr>"
      }
      pp += "</table>"
      return pp;
    }, {maxWidth: 500}).addTo(map);

    // add the next and prev URLs if provided in the geojson response
    let liId = "li_" + collectionId
    if ($("#" + liId)) {
      for (let l in data.links) {
        let lnk = data.links[l];
        if (lnk.rel == "next" || lnk.rel == "prev") {
          let btnId = "btn_" + lnk.rel + "_" + collectionId
          let ttl = (lnk.title) ? lnk.title : lnk.rel;
          let btn = "<button id='" + btnId + "' onclick='nextData(\"" + lnk.href + "\", \"" + collectionId + "\",\"" + itemType + "\")'>" + ttl + "</button>";
          if ($("#" + btnId).length > 0) {
            $("#" + btnId).replaceWith(btn)
          } else {
            $("#" + liId).append(btn)
          }
        }
      }
    }
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
  });
}
