// functions for transforming geometries using Proj4 leaflet
// for coordinate transformations, init the definition for proj
proj4.defs('EPSG:28992','+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs')
proj4.defs('https://www.opengis.net/def/crs/EPSG/0/28992','+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs')

// For 3D NL BAG data: it is a construct of EPSG:28992 and NAP for heights in the Netherlands
// This is a dirty Hack for the 3D encoded data, just use the same proj def for this, 
proj4.defs('https://www.opengis.net/def/crs/EPSG/0/7415','+proj=sterea +lat_0=52.15616055555555 +lon_0=5.38763888888889 +k=0.9999079 +x_0=155000 +y_0=463000 +ellps=bessel +units=m +towgs84=565.2369,50.0087,465.658,-0.406857330322398,0.350732676542563,-1.8703473836068,4.0812 +no_defs')


function transformToRD(coordinates) {
  return  proj4(  proj4('EPSG:4326'),  proj4('EPSG:28992'), [coordinates[0], coordinates[1]]);
}

function transformToWGS84(coordinates) {
  coords = proj4(  proj4('EPSG:28992'),  proj4('EPSG:4326'), coordinates);
  return [coords[1], coords[0]] // flip order !
}
