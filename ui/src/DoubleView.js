import React, { createRef, Component } from 'react';
import Button from 'react-bootstrap/Button';
import { Map, TileLayer, LayersControl, Marker, Popup, FeatureGroup, Circle } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import $ from 'jquery';
import './App.css';
import L from 'leaflet';
import 'leaflet-iiif';
import 'leaflet-rastercoords';
import 'leaflet-extra-markers';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-extra-markers/dist/css/leaflet.extra-markers.min.css';
window.$ = $;
var parse_georaster = require("georaster");
var GeoRasterLayer = require("georaster-layer-for-leaflet");
// work around broken icons when using webpack, see https://github.com/PaulLeCam/react-leaflet/issues/255

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.0/images/marker-icon.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.0/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.0.0/images/marker-shadow.png',
});

export default class DoubleView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      controlPoints: props.points,
      lat: 45.5845516,
      lng: 4.7209796,
      zoom: 13,
      inputUrl: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b53099839d/f1/',
      //inputUrl: 'https://stacks.stanford.edu/image/iiif/hg676jb4964%2F0380_796-44/info.json',
      layer: null,
      originalSizex: null,
      originalSizey: null,
      rc: null,
      left: '',
      status: '',
      right: '',
      leftCoord: null,
      rightCoord: null
    };
  }

  addControlPoint(point, coord) {
    this.state.controlPoints.push({pointid: this.state.controlPoints.length, x: point.x, y: point.y, lat:coord.lat, lng:coord.lng})
  }

  addControlPointImage(point) {
    this.state.controlPoints.push({pointid: this.state.controlPoints.length, x: point.x, y: point.y, lat:'?', lng:'?'})
    //console.log(this.state.controlpoints);
  }

  mapRef1 = createRef()
  mapRef2 = createRef()
  layerControlRef = createRef()

  componentDidMount() {
    const map1 = this.mapRef1.current
    console.log(map1)
    if (map1 != null) {
      /*map1.leafletElement.on('click', (e)=>{this.onClick(e)});*/
	    try {
        //url = 'https://stacks.stanford.edu/image/iiif/hg676jb4964%2F0380_796-44/info.json'
        //var url = 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b53099839d/f1/info.json'
        var newLayer = L.tileLayer.iiif(this.state.inputUrl+'info.json', {fitBounds: true, setMaxBounds: false})
        newLayer.addTo(map1.leafletElement)
        this.setState({layer: newLayer})
      } catch (error) {
	      console.log(error)
      }
    }
/*
    const map2 = this.mapRef2.current
    if (map2 != null) {
      map2.leafletElement.on('click', (e)=>{this.onRightClick(e)});
     }
*/
  }

  onLeftClick = (e) => {
    console.log("LEFT CLICK " + e.latlng);
    var coord = this.state.rc.project(e.latlng);
    console.log("rc coord = " + coord);
    //this.addControlPointImage(coord);
  //    this.pop(e.latlng);
    const map1 = this.mapRef1.current
    if (map1 != null) {
//      map1.leafletElement.off();
      map1.leafletElement.off('click', this.onLeftClick, this);
    }
    this.setState({left: e.latlng.lat+','+e.latlng.lng})
    this.setState({leftCoord: coord})
    if (this.state.rightCoord) {
      this.addControlPoint(this.state.leftCoord, this.state.rightCoord);
      this.setState({left: '', right: '', status: '', leftCoord: null, rightCoord: null})
    }
  }

  onRightClick(e) {
    console.log("RIGHT CLICK " + e.latlng);
    const map2 = this.mapRef2.current
    if (map2 != null) {
      map2.leafletElement.off('click', this.onRightClick, this);
    }
    this.setState({right: e.latlng.lat+','+e.latlng.lng})
    this.setState({rightCoord: e.latlng})
    if (this.state.leftCoord) {
      this.addControlPoint(this.state.leftCoord, this.state.rightCoord);
      this.setState({left: '', right: '', status: '', leftCoord: null, rightCoord: null})
    }
  }

  onPointClick(e) {
    console.log("POINT CLICK " + e.latlng);
    console.log('sourceTarget = ' + e.sourceTarget)
    e.target.options.color = 'orange';
  }


  georef(inputUrl, controlPoints) {
    console.log("GEOREF");

    var jsonString = JSON.stringify({
                                          url: inputUrl,
                                          points: controlPoints
                                        });
    console.log(jsonString);
    fetch('http://localhost:3000/georeference', {
    			method: 'POST',
    			body: jsonString,
    			headers: {
    				"Content-type": "application/json; charset=UTF-8"
    			}
    		}).then(response => {
    				return response.json()
    			}).then(json => {
//    				this.setState({
//    					user:json
//    				});
            console.log("RESULT = " + JSON.stringify(json));

            var layer = L.tileLayer('./tiles/{z}/{x}/{y}.png',
            {
            attribution: 'Map data',
            tms:true
            })
            layer.addTo(this.mapRef2.current.leafletElement);
            this.layerControlRef.current.addOverlay(layer, "Georeferenced Image");
    			});
  }

  newPoint() {
      console.log("New Point ?" + this.state.status)
      this.setState({status: 'new point'})
      const map1 = this.mapRef1.current
      if (map1 != null) {
        map1.leafletElement.on('click', this.onLeftClick, this);
      }
      const map2 = this.mapRef2.current
      if (map2 != null) {
        map2.leafletElement.on('click', this.onRightClick, this);
      }
  };

  render() {
    const position = [this.state.lat, this.state.lng];
    var _this = this;
    return (
      <div>
      <div className="container">
	    <Map center={[0, 0]} zoom={0} className="map" id="map1" crs={L.CRS.Simple} maxZoom={21} ref={this.mapRef1}>
        <FeatureGroup ref={ (reactFGref) => {this._onFeatureGroupReady(reactFGref);} }>
          <EditControl
              position='topright'
              onEdited={this._onEdited}
              onCreated={this._onCreated}
              onDeleted={this._onDeleted}
              onMounted={this._onMounted}
              onEditStart={this._onEditStart}
              onEditStop={this._onEditStop}
              onDeleteStart={this._onDeleteStart}
              onDeleteStop={this._onDeleteStop}
              draw={{
                  rectangle: false,
                  polyline: false,
                  polygon: false,
                  circle: false,
                  marker: false
              }}
          />
        </FeatureGroup>
      </Map>
      <div id="buttons">
        <Button id="button1" variant="primary" size="lg" onClick={function() {_this.newPoint();}}>+</Button>
        <Button id="georef" variant="primary" size="lg" onClick={function() {_this.georef(_this.state.inputUrl,_this.state.controlPoints);}}>G</Button>
      </div>
      <Map center={position} zoom={this.state.zoom} className="map" id="map2" ref={this.mapRef2}>
        <LayersControl position="topright" ref={this.layerControlRef}>
          <LayersControl.BaseLayer name="OpenStreetMap.BlackAndWhite">
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="OpenStreetMap.Mapnik" checked="true">
            <TileLayer
              attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
      </Map>
    </div>
    <h2>{this.state.left}:{this.state.status}:{this.state.right}</h2>
    </div>
    );
  }

  pop(latlng) {
      const map1 = this.mapRef1.current.leafletElement
      var popup = L.popup()
          .setLatLng(latlng)
          .setContent('<p>Hello world!<br />This is a nice popup.</p>')
          .openOn(map1);
  }

  createImageInfo() {
      const map1 = this.mapRef1.current.leafletElement
      if (this.state.originalSizex == null) {
        var imageSizes = this.state.layer._imageSizesOriginal
        var originalSize = imageSizes[imageSizes.length - 1]
        console.log("iiifLayer = " + originalSize.x + " - " + originalSize.y)
        this.setState({
          originalSizex: originalSize.x,
          originalSizey: originalSize.y,
          rc: new L.RasterCoords(map1, [originalSize.x, originalSize.y])
        });
      }
  }

  _onEdited = (e) => {

    let numEdited = 0;
    e.layers.eachLayer( (layer) => {
      numEdited += 1;
    });
    console.log(`_onEdited: edited ${numEdited} layers`, e);

    this._onChange();
  }

  _onCreated = (e) => {
    let type = e.layerType;
    let layer = e.layer;
    if (type === 'marker') {
      // Do marker specific actions
      console.log("_onCreated: marker created", e);
    }
    else {
      console.log("_onCreated: something else created:", type, e);
      console.log(e.layer);
      var coord = this.state.rc.project(e.layer.getLatLng());
      console.log("rc coord = " + coord);
      this.addControlPointImage(coord);
      //e.layer.setStyle({color: 'orange'});
//      var points = JSON.stringify(e.layer.toGeoJSON());
//      console.log(points);
      const map1 = this.mapRef1.current.leafletElement
      map1.eachLayer(function(layer){
        console.log(layer);
      });
      /*e.layer.on('click', this.onPointClick);*/
      e.layer.mytype = 'YOP';
    }
    // Do whatever else you need to. (save to db; etc)

    this._onChange();
  }

  _onDeleted = (e) => {

    let numDeleted = 0;
    e.layers.eachLayer( (layer) => {
      numDeleted += 1;
    });
    console.log(`onDeleted: removed ${numDeleted} layers`, e);

    this._onChange();
  }

  _onMounted = (drawControl) => {
    console.log('_onMounted', drawControl);
  }

  _onEditStart = (e) => {
    console.log('_onEditStart', e);
  }

  _onEditStop = (e) => {
    console.log('_onEditStop', e);
  }

  _onDeleteStart = (e) => {
    console.log('_onDeleteStart', e);
  }

  _onDeleteStop = (e) => {
    console.log('_onDeleteStop', e);
  }
  _editableFG = null
  _onFeatureGroupReady = (reactFGref) => {

    // populate the leaflet FeatureGroup with the geoJson layers

    if (reactFGref != null) {
      var _this = this;
      $.when(this.state.layer._infoDeferred).done(function() {
        _this.createImageInfo();
        let leafletLeftGeoJSON = new L.GeoJSON(_this.getLeftControlPoints(), {
          pointToLayer: function(geoJsonPoint, latlng) {
            //return L.circleMarker(latlng);
            console.log(geoJsonPoint.pointid)
            return L.marker(latlng, {
                                      icon: L.ExtraMarkers.icon({
                                          icon: 'fa-number',
                                          number: ''+geoJsonPoint.pointid,
                                          shape: 'circle',
                                          markerColor: 'black'
                                      })
                                  });
//          },
//          style: function (feature) {
//            return {color: 'blue'};
          }
        });
        let leafletRightGeoJSON = new L.GeoJSON(_this.getRightControlPoints(), {
          pointToLayer: function(geoJsonPoint, latlng) {
            //return L.circleMarker(latlng);
            console.log(geoJsonPoint.pointid)
            return L.marker(latlng, {
                                      icon: L.ExtraMarkers.icon({
                                          icon: 'fa-number',
                                          number: ''+geoJsonPoint.pointid,
                                          shape: 'circle',
                                          markerColor: 'black'
                                      })
                                  });
//          },
//          style: function (feature) {
//            return {color: 'blue'};
          }
        });
        let leafletFG = reactFGref.leafletElement;
//      leafletFG.eachLayer((layer) => {
//        layer.addData(leafletGeoJSON);
//      });
//      leafletGeoJSON.eachLayer( (layer) => {
//        leafletFG.addLayer(layer);
//      });

        _this.mapRef1.current.leafletElement.eachLayer(function(layer){
          if (!(layer instanceof L.TileLayer.Iiif)) {
            layer.remove()
          }
        });
        leafletLeftGeoJSON.addTo(_this.mapRef1.current.leafletElement)
        _this.mapRef2.current.leafletElement.eachLayer(function(layer){
          if (!(layer instanceof L.TileLayer)) {
            layer.remove()
          }
        });
        leafletRightGeoJSON.addTo(_this.mapRef2.current.leafletElement)

        // store the ref for future access to content

        _this._editableFG = reactFGref;
      });
    }
  }

  getLeftControlPoints() {
    var controlPointsAsFeatures = [];
    let rc = this.state.rc;
    this.state.controlPoints.forEach(function(element) {
      console.log("CP = " + element.x + " - " + element.y + " - " + element.pointid)
      let c = rc.unproject([element.x, element.y])
      console.log("CP unprojected = " + c)
      controlPointsAsFeatures.push({"type": "Point", "coordinates": [c.lng, c.lat], "pointid": element.pointid});
    });
    return controlPointsAsFeatures;
  }

  getRightControlPoints() {
    var controlPointsAsFeatures = [];
    this.state.controlPoints.forEach(function(element) {
      console.log(element)
      controlPointsAsFeatures.push({"type": "Point", "coordinates": [element.lng, element.lat], "pointid": element.pointid});
    });
    return controlPointsAsFeatures;
  }

  _onChange = () => {

    // this._editableFG contains the edited geometry, which can be manipulated through the leaflet API

    const { onChange } = this.props;

    console.log('ONCHANGE ' + this._editableFG + ' - ' + onChange);
    //const geojsonData = this._editableFG.leafletElement.toGeoJSON();

    //console.log(geojsonData);

    if (!this._editableFG || !onChange) {
      return;
    }

    //  const geojsonData = this._editableFG.leafletElement.toGeoJSON();

    //  console.log(geojsonData);
    //onChange(geojsonData);
  }
}
