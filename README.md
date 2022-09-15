# Test client for OGC API Features
Basic test client for OGC API Features (a.k.a. WFS 3), based on [Leaflet JS](https://leafletjs.com/) and [jQuery](https://jquery.com/). Just to access an OGC API Features (oapi-features) implementation, to see if it provides data.

In a logging screen it shows the requests sent to the API, to understand what is happening.

This test client originated from an earlier experiment of the Dutch OpenGeoGroep on WFS 3 (OGC API - Features), see https://github.com/opengeogroep/wfs3-experiment/.

## Scope
This client is work in progress and meant for just a basic demo / test to access an oapi-features implementation. No more than that (so it is not a full client on WFS 3 / OGC API Features for example). The code is kept simple and (hopefully) readable. So it is not intended

## Prerequisites of an API implementation
* support OGC API Features (WFS 3) core. [OGC API Features specification](https://github.com/opengeospatial/WFS_FES/)
* support Cross-origin resource sharing (CORS-enabled API), (tip: see [https://enable-cors.org/](https://enable-cors.org/) )
* support GeoJSON as encoding of data
* OpenAPI description of the service

## Live version
The live version from master (for this forked repo) is available at  [https://thijsbrentjens.github.io/ogc-api-features-testclient/src/](https://thijsbrentjens.github.io/ogc-api-features-testclient/src/)


### Limitations
The live version on github.io has limitations:
* only support APIs using https (secured connections): because of blocking mixed content in browsers, github.io is running on https, the API also must support https connections
