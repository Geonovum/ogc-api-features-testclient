# Test client for OGC API Features and API Records
Basic test client for OGC API Features and API Records, based on [Leaflet JS](https://leafletjs.com/) and [jQuery](https://jquery.com/). Just to show how to access an OGC API Features / Records implementation, to see if it provides data.

In a logging screen it shows the requests sent to the API, to understand what is happening.

This test client originated from an earlier experiment of the Dutch OpenGeoGroep on WFS 3 (OGC API - Features), see https://github.com/opengeogroep/wfs3-experiment/. It has been further developed during the OGC Code sprint in September 2022.

## Scope
This client is work in progress and meant for just a basic demo / test to access an oapi-features implementation. No more than that (so it is not a full client on OGC API Features / Records for example). 

## Prerequisites of an API implementation
* support [OGC API Features core](https://github.com/opengeospatial/ogcapi-features) or [OGC API Records DRAFT](https://github.com/opengeospatial/ogcapi-records/) including "free text search" using the `q` parameter
* support Cross-origin resource sharing (CORS-enabled API), (tip: see [https://enable-cors.org/](https://enable-cors.org/) )
* support GeoJSON as encoding of data (features or records)
* OpenAPI description of the service

### Limitations
The live version on github.io has limitations:
* only support APIs using https (secured connections): because of blocking mixed content in browsers, github.io is running on https, the API also must support https connections
