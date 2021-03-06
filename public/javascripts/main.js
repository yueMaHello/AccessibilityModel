/*
* The data source is stored in './public/data/'
* There are several sub folders belonging to this folder.
* The application will produce the the slider based on the structure of './public/data' directory.
* If you changed the data structure or names of the directories, you should change the 'sliderType' variable as well.
* The inner code should be suitable for similar data structure without any change.
* I will explain the logic to Juhong Yuan.
* */

var map;
var dataMatrix;
var reverseDataMatrix;
var check = false;
var scaleCheck=false;
//The attribute of id of feature layer. You should update it if you update the featureLayer
var featureLayerIdTitle = 'TAZ_New';
//load esri libraries
require(["esri/graphic","esri/geometry/Polyline","dojo/dom-construct",
    "esri/tasks/query","esri/dijit/Popup",
    "dojo/dom-class","esri/dijit/BasemapToggle","esri/dijit/Legend",
    "esri/map", "esri/layers/FeatureLayer","esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol","esri/renderers/ClassBreaksRenderer",
    "esri/Color", "dojo/dom-style", "dojo/domReady!"
], function(Graphic,Polyline,domConstruct,Query,Popup,domClass,BasemapToggle,Legend,Map, FeatureLayer,
            SimpleFillSymbol,SimpleLineSymbol,ClassBreaksRenderer,Color, domStyle
) {

    let sliderRecord = {
        filePath:null
    };
    let oldSliderRecord = {
        filePath:null
    };

    let maxDepth = checkDepth(sliderType);
    console.log(maxDepth);

    for(let i=1;i<maxDepth+1;i++){
        $('#dynamicRadioContainers').append('<div class="selection" id="'+i+'"></div>');
        sliderRecord[i] = null;
        oldSliderRecord[i] = null;

    }
    setSelection(sliderRecord,1,sliderType);

    function setSelection(record,num,tmpSliderType){
        $('#'+num).append('<div id="'+num+'Radios"></div>');

        if(isDict(tmpSliderType)) {
            for (let k in tmpSliderType) {
                $('#'+num+'Radios').append('<input type="radio" name="'+num+'Radios" value="'+k+'" id="'+k+'">')
                            .append('<label for="'+k+'">'+k+'</label>')
            }
            $('#'+num+'Radios').radiosToSlider({animation: true});
            $('#'+num+'Radios').click(function(e){
                if(typeof($("input[name='"+num+"Radios']:checked").val())!=='undefined' && $("input[name='"+num+"Radios']:checked").val()!==oldSliderRecord[num]) {
                    record[num] = $("input[name='" + num + "Radios']:checked").val();
                    record.filePath = null;
                    record  = emptyOtherSelection(num, maxDepth,record);
                    oldSliderRecord = record;
                    setSelection(record, num + 1, tmpSliderType[record[num]]);
                }
            });
        }
        else{
            for (let k=0;k<tmpSliderType.length;k++) {
                // $('#'+num).append('<option>' + tmpSliderType[k] + '</option>');
                $('#'+num+'Radios').append('<input type="radio" name="'+num+'Radios" value="'+tmpSliderType[k]+'" id="'+tmpSliderType[k]+'">')
                    .append('<label for="'+tmpSliderType[k]+'">'+tmpSliderType[k]+'</label>')
            }
            $('#'+num+'Radios').radiosToSlider({animation: true});
            $('#'+num+'Radios').click(function(e){

                if(typeof($("input[name='"+num+"Radios']:checked").val())!=='undefined' && $("input[name='"+num+"Radios']:checked").val()!==oldSliderRecord[num]) {
                    record[num] =$("input[name='"+num+"Radios']:checked").val();
                    oldSliderRecord[num]=record[num];
                    record.filePath = generateFilePath(num,record);
                    console.log(record.filePath);
                    $("#wait").css("display", "block");
                    redrawLayer(record.filePath);

                }

            })
        }
    }
    function emptyOtherSelection(num,maxValue,record){
        for(let i=num+1;i<maxValue+1;i++){
            record[i] =null;
            $('#'+i).empty();
        }
        return record
    }
    function generateFilePath(num,record){
        // console.log(record,num)
        result = './data';
        for(let i=1;i<num;i++){
            result = result + '/'+record[i]
        }
        result+='/'+record[num]+'.csv';
        return result

    }

    //click radio1 button, the visibility property of other radios is based on radio1 button
    function redrawLayer(selectMatrixName){
        d3.csv(selectMatrixName,function(d){
            let result = buildMatrixLookup(d);
            dataMatrix = result[0];
            reverseDataMatrix = result[1];
            changeScale();
            featureLayer.redraw();
            $("#wait").css("display", "none");
        });
    }


    map = new Map("map", {
        basemap: "dark-gray-vector",
        center: [-113.4909, 53.5444],
        zoom: 9,
        minZoom:6,
        slider: false
    });

    var toggle = new BasemapToggle({
        map: map,
        basemap: "streets"
    }, "viewDiv");

    toggle.startup();

    var featureLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/newestTAZ/FeatureServer/0",{
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"],

    });
    var lrtFeatureLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/LRT/FeatureServer/0",{
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"],
    });
    // PSELayer = addPSELocation();
    var pseLayer = new FeatureLayer("https://services8.arcgis.com/FCQ1UtL7vfUUEwH7/arcgis/rest/services/pse/FeatureServer/0",{
        mode: FeatureLayer.MODE_SNAPSHOT,
        outFields: ["*"],
    });
    resetLayer();
    //legend
    $('#legendDiv').append('<div class="legendClass" id = "legendid" </div>');
    var legend = new Legend({
        map: map,
        layerInfos: [{layer:pseLayer,title:'Institutions'},{layer:lrtFeatureLayer,title:'LRT'}]
    }, 'legendid');

    map.on('load',function(){
        map.addLayer(featureLayer);
        map.addLayer(lrtFeatureLayer);
        map.addLayer(pseLayer);
        legend.startup();
        featureLayer.redraw();
    });
    //slider which is used to switch between 'destination to origin' and 'origin to destination'
    $("#interact").click(function(e, parameters) {
        if($("#interact").is(':checked')){
            check = true;
            $('#sliderNote').html("Destination&nbspto&nbspOrigin");
            changeScale();
            featureLayer.redraw();
        }
        else{
            check = false;
            $('#sliderNote').html("Origin&nbspto&nbspDestination");
            changeScale();
            featureLayer.redraw();

        }
    });
    $("#interact2").click(function(e, parameters) {
        if($("#interact2").is(':checked')){
            scaleCheck = true;
            $('#sliderNote2').html("Absolute&nbspScale");
            changeScale();
            featureLayer.redraw();
        }
        else{
            scaleCheck = false;
            $('#sliderNote2').html("Relative&nbspScale");
            changeScale();
            featureLayer.redraw();

        }
    });
    function resetLayer(){
        let symbol = new SimpleFillSymbol();
        var renderer = new ClassBreaksRenderer(symbol,function(feature){
            return 1;
        });
        renderer.addBreak(-Infinity, Infinity, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),0.3)).setColor(new Color([255, 255, 255,0.30])));
        featureLayer.setRenderer(renderer);
        featureLayer.redraw()
    }
    function changeScale(){
        let symbol = new SimpleFillSymbol();
        if(scaleCheck===false){
            var renderer = new ClassBreaksRenderer(symbol, function(feature){
                //if 'var check' is false, then show origin to destination
                if(check === false){
                    return dataMatrix[feature.attributes[featureLayerIdTitle]];
                }
                //else, destination to origin
                else{
                    return reverseDataMatrix[feature.attributes[featureLayerIdTitle]];
                }
            });

            //legend. If you want to change legend scale or legend color, this part of code needs to be modified
            renderer.addBreak(-Infinity, 0.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([255, 255, 255,0.90])));
            renderer.addBreak(0.5, 1, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	249, 238, 237,0.90])));
            renderer.addBreak(1, 1.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([243, 224, 219,0.90])));
            renderer.addBreak(1.5,2, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([237, 214, 202,0.90])));
            renderer.addBreak(2, 2.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([225, 200, 170,0.90])));
            renderer.addBreak(2.5,3, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([213, 196, 141,0.90])));
            renderer.addBreak(3, 3.25, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([207, 197, 127,0.90])));
            renderer.addBreak(3.25,3.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([201, 199, 113,0.90])));
            renderer.addBreak(3.5,3.75, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([185, 195, 101,0.90])));
            renderer.addBreak(3.75,4, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([168, 189, 88,0.90])));
            renderer.addBreak(4,4.25, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([149, 183, 77,0.90])));
            renderer.addBreak(4.25,4.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([129, 177, 66,0.90])));
            renderer.addBreak(4.5,4.75, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([109, 171, 55,0.90])));
            renderer.addBreak(4.75, 5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([87, 165, 45,0.90])));
            renderer.addBreak(5, 5.25, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	66, 159, 36,0.90])));
            renderer.addBreak(5.25,5.5, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([44, 153, 27,0.90])));
            renderer.addBreak(5.5,5.75, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	37, 121, 24,0.90])));
            renderer.addBreak(5.75,6 , new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([11, 106, 18,0.90])));
            renderer.addBreak(6, Infinity, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([5, 80, 15,0.90])));
            featureLayer.setRenderer(renderer);



        }
        else{
            var valueArray;
            if(check === false){
                valueArray =  Object.values(dataMatrix).sort(function(a, b){return a - b});
            }
            else{
                valueArray =  Object.values(reverseDataMatrix).sort(function(a, b){return a - b});
            }
            var chunksize = 90;
            var renderer = new ClassBreaksRenderer(symbol, function(feature){
                //if 'var check' is false, then show origin to destination
                if(check === false){
                    return dataMatrix[feature.attributes[featureLayerIdTitle]];
                }
                //else, destination to origin
                else{
                    return reverseDataMatrix[feature.attributes[featureLayerIdTitle]];
                }
            });
            renderer.addBreak(-Infinity, valueArray[chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([255, 255, 255,0.90])));
            renderer.addBreak(valueArray[chunksize], valueArray[2*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	249, 238, 237,0.90])));
            renderer.addBreak(valueArray[2*chunksize],valueArray[3*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([243, 224, 219,0.90])));
            renderer.addBreak(valueArray[3*chunksize],valueArray[4*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([237, 214, 202,0.90])));
            renderer.addBreak(valueArray[4*chunksize], valueArray[5*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([225, 200, 170,0.90])));
            renderer.addBreak(valueArray[5*chunksize],valueArray[6*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([213, 196, 141,0.90])));
            renderer.addBreak(valueArray[6*chunksize], valueArray[7*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([207, 197, 127,0.90])));
            renderer.addBreak(valueArray[7*chunksize],valueArray[8*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([201, 199, 113,0.90])));
            renderer.addBreak(valueArray[8*chunksize],valueArray[9*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([185, 195, 101,0.90])));
            renderer.addBreak(valueArray[9*chunksize],valueArray[10*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([168, 189, 88,0.90])));
            renderer.addBreak(valueArray[10*chunksize],valueArray[11*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([149, 183, 77,0.90])));
            renderer.addBreak(valueArray[11*chunksize],valueArray[12*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([129, 177, 66,0.90])));
            renderer.addBreak(valueArray[12*chunksize],valueArray[13*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([109, 171, 55,0.90])));
            renderer.addBreak(valueArray[13*chunksize], valueArray[14*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([87, 165, 45,0.90])));
            renderer.addBreak(valueArray[14*chunksize], valueArray[15*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	66, 159, 36,0.90])));
            renderer.addBreak(valueArray[15*chunksize], valueArray[16*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([44, 153, 27,0.90])));
            renderer.addBreak(valueArray[16*chunksize], valueArray[17*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([	37, 121, 24,0.90])));
            renderer.addBreak(valueArray[17*chunksize], valueArray[18*chunksize], new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([11, 106, 18,0.90])));
            renderer.addBreak(valueArray[18*chunksize], Infinity, new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,new Color([0,0,0,0.1]),1)).setColor(new Color([5, 80, 15,0.90])));
            featureLayer.setRenderer(renderer);
        }
    }
});
//read csv file into a 2d matrix
function buildMatrixLookup(arr) {
    var lookup = {};
    var logsumOfLogsum = {};
    var reverseLogsumOfLogsum={};
    var index = arr.columns;
    var verbal = index[0];
    for(var i =0; i<arr.length;i++){
        var k = arr[i][verbal];
        delete arr[i][verbal];
        lookup[parseInt(k)] = Object.keys(arr[i]).reduce((obj, key) => (obj[parseInt(key)] = Number(arr[i][key]),obj), {});
    }
    for(var i in lookup){
        var total = 0;
        var reverseTotal = 0;

        for(var j in lookup[i]){
            total += Math.exp(lookup[i][j])
            reverseTotal += Math.exp(lookup[j][i])

        }

        logsumOfLogsum[i] =  getBaseLog(2.718,total);
        reverseLogsumOfLogsum[i] = getBaseLog(2.718,reverseTotal);
    }

    return [logsumOfLogsum,reverseLogsumOfLogsum];
}



function getBaseLog(x, y) {
    return Math.log(y) / Math.log(x);
}
//legend is based on this range
function findRangeForIndividualCalcultion(){
    return dataMatrix['101'];
}

function checkDepth(object){
    var level = 1;
    var key;
    for(key in object) {
        if (!object.hasOwnProperty(key)) continue;

        if(typeof(object[key])=== 'object'){
            var depth = checkDepth(object[key]) + 1;
            level = Math.max(depth, level);
        }
    }
    return level;

}
function isDict(v) {
    return typeof v==='object' && v!==null && !(v instanceof Array) && !(v instanceof Date);
}