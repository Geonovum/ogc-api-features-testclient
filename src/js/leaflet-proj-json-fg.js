/* 

Test code for extending Proj4Leaflet for using the JSON-FG way of handling geometries. JSON-FG is a superset of GeoJSON.
For this test, main differences with / relevant charactersices compared to regular GeoJSON are:
- JSON-FG uses a place property on a feature for the geometry (feature.place)
- the CRS used is set in coordRefSys

This projected layer uses the CRS information and only filters JSON-FG features from the data for this layer.

*/

L.Proj.JSONFG = L.GeoJSON.extend({
    initialize: function(jsonfg, options) {
        this._callLevel = 0;
        L.GeoJSON.prototype.initialize.call(this, jsonfg, options);
    },

    addData: function(jsonfg) {
        var crs;
        // Thijs: this part is changed from the original Proj4Leaflet code
        // for now just a hack: for each feature
        // for the first run, rewrite the place property to be the geometry for each feature
        
        if (jsonfg) {       
            // only work with data that contains CRS information 
            if (jsonfg.coordRefSys) {
                crs = new L.Proj.CRS(jsonfg.coordRefSys);
                // at root level, rewrite the props for geometry/place first
                const filteredJsonFgFeatures = [];
                for (let i in jsonfg.features) {
                    let ft = jsonfg.features[i];
                    // if there is no geometry, but there is a place property, this is a JSON-FG Feature. 
                    // For further processing in Leaflet, use this hack: rewrite the feature to use the property 'geometry' instead of place
                    // coordRefSys only (by definition) applies to the place property, not to geometry
                    // if the feature has no place, for now ignore it, don't add it to the data                    
                    if (ft.place && ft.type == "Feature") {
                        ft.geometry = ft.place;
                        // NOTE: for now: if 3D, rewrite geometry type, this is only for the 3D Bag testfile
                        // for testing with 3d data fron 3dBAG   
                        if (ft.geometry.type =="Polyhedron") ft.geometry.type = "MultiPolygon";                     
                        filteredJsonFgFeatures.push(ft)
                    } 
                }
                // reset the original features:
                jsonfg.features = filteredJsonFgFeatures;
            }            
            // Thijs: code from here on is the same as L.Proj.GeoJSON in Proj4Leaflet code

            if (crs !== undefined) {
                this.options.coordsToLatLng = function(coords) {
                    var point = L.point(coords[0], coords[1]);
                    return crs.projection.unproject(point);
                };
            }
        }
        // Base class' addData might call us recursively, but
        // CRS shouldn't be cleared in that case, since CRS applies
        // to the whole GeoJSON, inluding sub-features.
        this._callLevel++;
        try {
            L.GeoJSON.prototype.addData.call(this, jsonfg);
        } finally {
            this._callLevel--;
            if (this._callLevel === 0) {
                delete this.options.coordsToLatLng;
            }
        }
    }
});

L.Proj.jsonFg = function(jsonfg, options) {
    return new L.Proj.JSONFG(jsonfg, options);
};