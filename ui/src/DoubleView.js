import React, { createRef, Component } from 'react';
import Button from 'react-bootstrap/Button';
import { Map, TileLayer, LayersControl, FeatureGroup } from 'react-leaflet';
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
      lat: 45.5845516,
      lng: 4.7209796,
      zoom: 13,
      inputUrl: 'https://gallica.bnf.fr/iiif/ark:/12148/btv1b53099839d/f1/',
      //inputUrl: 'https://stacks.stanford.edu/image/iiif/hg676jb4964%2F0380_796-44/',
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

  mapRef1 = createRef()
  mapRef2 = createRef()
  layerControlRef = createRef()
  leftFeatureGroupRef = createRef()
  rightFeatureGroupRef = createRef()

  componentDidMount() {
    const map1 = this.mapRef1.current
    console.log(map1)
    if (map1 != null) {
	    try {
        var newLayer = L.tileLayer.iiif(this.state.inputUrl+'info.json', {fitBounds: true, setMaxBounds: false})
        newLayer.addTo(map1.leafletElement)
        var _this = this;
        $.when(newLayer._infoDeferred).done(function() {
//          console.log("infoDeferred")
          var imageSizes = newLayer._imageSizesOriginal
          var originalSize = imageSizes[imageSizes.length - 1]
//          console.log("iiifLayer = " + originalSize.x + " - " + originalSize.y)
          _this.setState({
            layer: newLayer,
            originalSizex: originalSize.x,
            originalSizey: originalSize.y,
            rc: new L.RasterCoords(map1.leafletElement, [originalSize.x, originalSize.y])
          });
        })
      } catch (error) {
	      console.log(error)
      }
    }
  }

  // remove the last layer of FeatureGroup a if it is longer thant FeatureGroup b.
  cleanIfLonger(a,b) {
    if (a.getLayers().length > b.getLayers().length) {
      a.removeLayer(a.getLayers().pop())
    }
  }

  onLeftClick = (e) => {
    const map1 = this.mapRef1.current
    if (map1 != null) {
      map1.leafletElement.off('click', this.onLeftClick, this);
      let leftFG = this.leftFeatureGroupRef.current.leafletElement
      let rightFG = this.rightFeatureGroupRef.current.leafletElement
      this.cleanIfLonger(leftFG,rightFG)
      let pointid = leftFG.getLayers()?leftFG.getLayers().length:0;
      var markericon = L.ExtraMarkers.icon({
                                 icon: 'fa-number',
                                 number: ''+pointid,
                                 shape: 'circle',
                                 markerColor: 'black'
                               });
      var marker = L.marker(e.latlng, {
        icon: markericon
      });
      leftFG.addLayer(marker);
    }
    var coord = this.state.rc.project(e.latlng);
//    console.log("rc coord = " + coord);
    this.setState({left: e.latlng.lat+','+e.latlng.lng, leftCoord: coord})
    if (this.state.rightCoord) {
      this.setState({left: '', right: '', status: '', leftCoord: null, rightCoord: null})
    }
  }

  onRightClick(e) {
    const map2 = this.mapRef2.current
    if (map2 != null) {
      map2.leafletElement.off('click', this.onRightClick, this);
      let leftFG = this.leftFeatureGroupRef.current.leafletElement
      let rightFG = this.rightFeatureGroupRef.current.leafletElement
      this.cleanIfLonger(rightFG,leftFG)
      let pointid = rightFG.getLayers()?rightFG.getLayers().length:0;
      let marker = L.marker(e.latlng, {
        icon: L.ExtraMarkers.icon({
          icon: 'fa-number',
          number: ''+pointid,
          shape: 'circle',
          markerColor: 'black'
        })
      });
      rightFG.addLayer(marker);
    }
    this.setState({right: e.latlng.lat+','+e.latlng.lng, rightCoord: e.latlng})
    if (this.state.leftCoord) {
      this.setState({left: '', right: '', status: '', leftCoord: null, rightCoord: null})
    }
  }

  georef() {
    console.log("GEOREF " + this.state.inputUrl);
    var controlPoints = [];
    let leftLayers = this.leftFeatureGroupRef.current.leafletElement.getLayers()
    let rightLayers = this.rightFeatureGroupRef.current.leafletElement.getLayers()
    let number =  Math.min(leftLayers.length, rightLayers.length)
    if (number > 2) {
      for (var i = 0; i < number; i++) {
        let leftLatLng = leftLayers[i].getLatLng()
        let coord = this.state.rc.project(leftLatLng);
        let rightLatLng = rightLayers[i].getLatLng()
        controlPoints.push({pointid: i, x: coord.x, y: coord.y, lat:rightLatLng.lat, lng:rightLatLng.lng})
      }
      var jsonString = JSON.stringify({url: this.state.inputUrl, points: controlPoints});
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
              console.log("RESULT = " + JSON.stringify(json));
              var layer = L.tileLayer('./tiles/{z}/{x}/{y}.png', { attribution: 'Map data', tms:true})
              layer.addTo(this.mapRef2.current.leafletElement);
              this.layerControlRef.current.addOverlay(layer, "Georeferenced Image");
            });
    }
  }

  newPoint() {
//      console.log("New Point ?" + this.state.status)
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
        <FeatureGroup ref={this.leftFeatureGroupRef}>
          <EditControl
            position='topright'
            onEdited={this._onLeftEdited}
            onCreated={this._onLeftCreated}
            onDeleted={this._onLeftDeleted}
            onMounted={this._onLeftMounted}
            onEditStart={this._onLeftEditStart}
            onEditStop={this._onLeftEditStop}
            onDeleteStart={this._onLeftDeleteStart}
            onDeleteStop={this._onLeftDeleteStop}
            draw={{
              rectangle: false,
              polyline: false,
              polygon: false,
              circle: false,
              marker: false,
              circlemarker: false
            }}
          />
        </FeatureGroup>
      </Map>
      <div id="buttons">
        <Button id="button1" variant="primary" size="lg" onClick={function() {_this.newPoint();}}>+</Button>
        <Button id="georef" variant="primary" size="lg" onClick={function() {_this.georef();}}>G</Button>
      </div>
      <Map center={position} zoom={this.state.zoom} className="map" id="map2" ref={this.mapRef2}>
        <FeatureGroup ref={this.rightFeatureGroupRef}>
          <EditControl
            position='topright'
            onEdited={this._onRightEdited}
            onCreated={this._onRightCreated}
            onDeleted={this._onRightDeleted}
            onMounted={this._onRightMounted}
            onEditStart={this._onRightEditStart}
            onEditStop={this._onRightEditStop}
            onDeleteStart={this._onRightDeleteStart}
            onDeleteStop={this._onRightDeleteStop}
            draw={{
              rectangle: false,
              polyline: false,
              polygon: false,
              circle: false,
              marker: false,
              circlemarker: false
            }}
          />
        </FeatureGroup>
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

  //LEFT EVENTS
  _onLeftEdited = (e) => {
    let numEdited = 0;
    e.layers.eachLayer( (layer) => {
      numEdited += 1;
    });
    console.log(`_onLeftEdited: edited ${numEdited} layers`, e);
    this._onLeftChange();
  }
  _onLeftCreated = (e) => {
    let type = e.layerType;
//    let layer = e.layer;
    if (type === 'marker') {
      // Do marker specific actions
      console.log("_onLeftCreated: marker created", e);
    }
    else {
      console.log("_onLeftCreated: something else created:", type, e);
      console.log(e.layer);
      var coord = this.state.rc.project(e.layer.getLatLng());
      console.log("rc coord = " + coord);
//      this.addControlPointImage(coord);
      //e.layer.setStyle({color: 'orange'});
//      var points = JSON.stringify(e.layer.toGeoJSON());
//      console.log(points);
//      const map1 = this.mapRef1.current.leafletElement
//      map1.eachLayer(function(layer){
//        console.log(layer);
//      });
      /*e.layer.on('click', this.onPointClick);*/
      e.layer.mytype = 'YOP';
    }
    // Do whatever else you need to. (save to db; etc)
    this._onLeftChange();
  }
  _onLeftDeleted = (e) => {
    let numDeleted = 0;
    e.layers.eachLayer( (layer) => {
      numDeleted += 1;
    });
    console.log(`onLeftDeleted: removed ${numDeleted} layers`, e);
    this._onLeftChange();
  }
  _onLeftMounted = (drawControl) => {
    console.log('_onLeftMounted', drawControl);
  }
  _onLeftEditStart = (e) => {
    console.log('_onLeftEditStart', e);
  }
  _onLeftEditStop = (e) => {
    console.log('_onLeftEditStop', e);
  }
  _onLeftDeleteStart = (e) => {
    console.log('_onLeftDeleteStart', e);
  }
  _onLeftDeleteStop = (e) => {
    console.log('_onLeftDeleteStop', e);
  }
  //RIGHT EVENTS
  _onRightEdited = (e) => {
    let numEdited = 0;
    e.layers.eachLayer( (layer) => {
      numEdited += 1;
    });
    console.log(`_onRightEdited: edited ${numEdited} layers`, e);
    this._onRightChange();
  }
  _onRightCreated = (e) => {
    let type = e.layerType;
//    let layer = e.layer;
    if (type === 'marker') {
      // Do marker specific actions
      console.log("_onRightCreated: marker created", e);
    }
    else {
      console.log("_onRightCreated: something else created:", type, e);
      console.log(e.layer);
      e.layer.mytype = 'YOP';
    }
    // Do whatever else you need to. (save to db; etc)
    this._onRightChange();
  }
  _onRightDeleted = (e) => {
    let numDeleted = 0;
    e.layers.eachLayer( (layer) => {
      numDeleted += 1;
    });
    console.log(`onRightDeleted: removed ${numDeleted} layers`, e);
    this._onRightChange();
  }
  _onRightMounted = (drawControl) => {
    console.log('_onRightMounted', drawControl);
  }
  _onRightEditStart = (e) => {
    console.log('_onRightEditStart', e);
  }
  _onRightEditStop = (e) => {
    console.log('_onRightEditStop', e);
  }
  _onRightDeleteStart = (e) => {
    console.log('_onRightDeleteStart', e);
  }
  _onRightDeleteStop = (e) => {
    console.log('_onRightDeleteStop', e);
  }

  _editableFG = null

  _onLeftChange = () => {
    // this._editableFG contains the edited geometry, which can be manipulated through the leaflet API
    const { onChange } = this.props;
    console.log('ONLEFTCHANGE ' + this._editableFG + ' - ' + onChange);
    if (!this._editableFG || !onChange) {
      return;
    }
    //  const geojsonData = this._editableFG.leafletElement.toGeoJSON();
    //  console.log(geojsonData);
    //onChange(geojsonData);
  }
  _onRightChange = () => {
    // this._editableFG contains the edited geometry, which can be manipulated through the leaflet API
    const { onChange } = this.props;
    console.log('ONRIGHTCHANGE ' + this._editableFG + ' - ' + onChange);
    if (!this._editableFG || !onChange) {
      return;
    }
    //  const geojsonData = this._editableFG.leafletElement.toGeoJSON();
    //  console.log(geojsonData);
    //onChange(geojsonData);
  }
}
