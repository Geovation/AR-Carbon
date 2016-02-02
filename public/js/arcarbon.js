
jQuery(document).ready(function($) {
    console.log("dadsadassa");
    // Initialisation
    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmAttrib = '&copy; <a href="http://openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        osm = L.tileLayer(osmUrl, {maxZoom: 18, attribution: osmAttrib}),
        map = new L.Map('arcarbon-map', {layers: [osm], center: new L.LatLng(51.505, -0.04), zoom: 15}),
        drawnItems = new L.FeatureGroup(),
        saveArray = [],
        totalHectares = 0.0;

    map.addLayer(drawnItems);

    var controls = new L.Control.Draw({
        draw: {
            polyline  : false,
            circle    : false,
            rectangle : false,
            marker    : false,
            polygon  : {
                allowIntersection: false,
                drawError: {
                   color: '#e1e100', // Color the shape will turn when intersects
                   message: '<strong>Oh snap!<strong> you can\'t draw that!' // Message that will show when intersect
                },
                weight: 12
            }
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    var disableControls = new L.Control.Draw({ draw: false, edit : false});
    map.addControl(controls);
    L.control.locate().addTo(map);

    // Event Handlers

    map.on('draw:created', function(event) {
        var layer = event.layer;

        intersects = checkIntersections(layer);
        if (intersects) {
            map.removeLayer(layer);
            $('#intersects').openModal();
            return;
        }

        var area = getArea(layer);
        addLabel(layer, area.toFixed(2));

        // Add DOM element to layer and DOM
        var domElement =
            $('<div class="mat-row ar-map-plot">'+
                '<div class="mat-col mat-s6"> Hectares </div>'+
                '<div class="mat-col mat-s6 hectares">'+area.toFixed(2)+'</div>'+
              '</div>');
        $(".ar-map-plots").append(domElement);
        layer.domElement = domElement;

        // Set the colour and add the layer to the list of drawn layers
        layer.setStyle({fillColor: '#15693b', color: '#15693b'});
        drawnItems.addLayer(layer);

        // Add the leaflet layer mouse over / dom layer highlight effect
        addMouseOver(layer, domElement);
        updateTotalArea();
    });

    map.on('draw:edited', function (event) {

        event.layers.eachLayer(function (layer) {
            var area = getArea(layer).toFixed(2);
            $(layer.domElement).find(".hectares").text(area);
            removeLabel(layer);
            addLabel(layer, area);
            console.log("label added", layer.label);
        });

        updateTotalArea();

    });

    map.on('draw:deleted', function (event) {
        console.log("Deleting...");
        event.layers.eachLayer(function (layer) {
            $(layer.domElement).remove();
            removeLabel(layer);
        });
        updateTotalArea();

    });


    // Labelling Functions
    map.on("zoomend", function(event){

    });


    function removeLabel(layer) {
        map.removeLayer(layer.label);
    }

    function addLabel(layer, text) {
        layer.label = L.marker(layer.getBounds().getCenter(), {
            icon: L.divIcon({
                className: 'field-div-icon',
                html: String(text),
                iconSize: [100, 40]
            })
        }).addTo(map);
    }

    // FOR ALL LAYERS YOU NEED TO LOOP THROUGH DRAWN LAYERS!

    function addMouseOver(layer, domElement) {
        layer.on("mouseover", function (e) {
            $(domElement).css("background-color", "#daeac6");
        });
        layer.on("mouseout", function (e) {
            $(domElement).css("background-color", "#ffffff");
        });
    }

    function getArea(layer) {
        return L.GeometryUtil.geodesicArea(layer.getLatLngs()) / 10000;
    }

    function checkIntersections(layer1) {
        var inter = false;
        drawnItems.eachLayer( function(layer2) {
            if (turf.intersect(layer1.toGeoJSON(), layer2.toGeoJSON())) {
                inter = true;
            }
        });
        return inter;

    }

    // Update the total area
    function updateTotalArea() {

        var area = 0.0;
        totalHectares = 0.0;
        if ($(".hectares").length > 0) {
            $(".hectares").each(function(i, item) {
                totalHectares += Number($(item).text());
            });
        }
        checkTotalHectares(totalHectares);
        $("#area-value").html("<h5>"+totalHectares.toFixed(2)+"</h2>");
        updatePostData();

    }

    function updatePostData() {
        var geojson = JSON.stringify(drawnItems.toGeoJSON());
        $(".ar-map-submit").attr("data-geojson", geojson);
        $(".ar-map-submit").attr("data-area", totalHectares);
    }

    // Check if the total hectares is over 50
    function checkTotalHectares(totalHectares) {
        if (totalHectares > 50) {
            $(".ar-map-total").css("background-color", "#ffc0c0");
            $(".ar-map-total").css("color", "#ff0000");
            $(".leaflet-draw-draw-polygon").hide();
            $(".ar-map-submit").prop('disabled',true);
            $('#overfifty').openModal();
        }
        else {
            $(".ar-map-total").css("background-color", "#daeac6");
            $(".ar-map-total").css("color", "#15693b");
            $(".ar-map-submit").prop('disabled',false);
            $(".leaflet-draw-draw-polygon").show();
        }
    }

});
