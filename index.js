import 'ol/ol.css';
import { getUid } from 'ol/util.js';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import ImageLayer from 'ol/layer/Image';
import { OSM, TileDebug, XYZ, Raster } from 'ol/source';
import CanvasTileLayerRenderer from 'ol/renderer/canvas/TileLayer.js'

CanvasTileLayerRenderer.prototype.drawTileImage = function (tile, frameState, x, y, w, h, gutter, transition, opacity) {
    var image = this.getTileImage(tile);
    if (!image) {
        return;
    }
    var uid = getUid(this);
    var tileAlpha = transition ? tile.getAlpha(uid, frameState.time) : 1;
    var alpha = opacity * tileAlpha;
    var alphaChanged = alpha !== this.context.globalAlpha;
    if (alphaChanged) {
        this.context.save();
        this.context.globalAlpha = alpha;
    }
    // --------------------------------------------- MY CHANGE
    this.context.imageSmoothingEnabled = false
    // --------------------------------------------- MY CHANGE
    this.context.drawImage(image, gutter, gutter, image.width - 2 * gutter, image.height - 2 * gutter, x, y, w, h);
    if (alphaChanged) {
        this.context.restore();
    }
    if (tileAlpha !== 1) {
        frameState.animate = true;
    }
    else if (transition) {
        tile.endTransition(uid);
    }
}

const xyzurl = 'https://mbenzekri.github.io/fr-communes/fr/communes'
const mapcolor = new window.Map()

function initScribble() {

    const xyz = new XYZ({
        url: xyzurl + '/{z}/{x}/{y}.png',
        maxZoom: 12,
        minZoom: 5,
        crossOrigin: 'anonymous',
        tileSize: 256,
        transition: 0,
        opaque: false
    })

    const rastersource = new Raster({
        sources: [xyz],
        operation: function (pixels, data) {
            const pixel = pixels[0]
            if (pixel[3] === 0) return pixel
            const key = pixel2key(pixel)
            let props = mapcolor.get(key)
            return props ? props.color : pixel
        },
        threads: 0
    })

    const thematiclayer = new ImageLayer({
        source: rastersource,
        transition: 0
    })

    const debuglayer = new TileLayer({
        source: new TileDebug(),
        visible: false
    })

    const map = new Map({
        layers: [
            new TileLayer({
                source: new OSM()
            }),
            thematiclayer,
            debuglayer
        ],
        target: 'map',
        view: new View({
            center: [260000, 6250000],
            zoom: 5,
            zoomFactor: 2
        })
    })

    thematiclayer.on('prerender', evt => {
    })

    const debugcheck = document.getElementById('debugcheck')
    const thematiccheck = document.getElementById('thematiccheck')

    debugcheck.onchange = function () { debuglayer.setVisible(this.checked) }
    thematiccheck.onchange = function () { thematiclayer.setVisible(this.checked) }
    debugcheck.checked = debuglayer.getVisible()
    thematiccheck.checked = thematiclayer.getVisible()
}

function load() {
    return new Promise((resolve, reject) => {
        var script = document.createElement('script');
        script.onload = function (evt) {
            resolve(evt)
        };
        script.onerror = function (evt) {
            reject(evt)
        };
        script.src = xyzurl + '.js';
        document.head.appendChild(script)
    })
}

load()
    .then(evt => {
        console.log(evt)
        return fetch(xyzurl+'.json').then(resp => resp.json())
    }).then((data) => {
        data.forEach(kvp => {
            const r = Math.ceil(Math.random() * 256)
            const g = Math.ceil(Math.random() * 256)
            const b = Math.ceil(Math.random() * 256)
            const color = [r, g, b, 255]
            mapcolor.set(kvp.key, { color : color, name: kvp.name })
        })
        initScribble()
    })
    .catch(evt =>
        console.log(evt)
    )

