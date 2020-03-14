import 'ol/ol.css';
import { getUid } from 'ol/util.js';
import { Map as olMap } from 'ol/Map';
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

class ThematicLayer extends ImageLayer {
    /**
     * 
     * @param {string} xyzurl 
     * @param {function} p2k 
     * @param {Map<string,any>} mapcolor 
     */
    constructor(xyzurl, p2k, mapcolor) {
        this.mapcolor = mapcolor
        this.pixel2key = p2k
        super({
            source: new Raster({
                sources: [new XYZ({
                    url: xyzurl + '/{z}/{x}/{y}.png',
                    maxZoom: 12,
                    minZoom: 5,
                    crossOrigin: 'anonymous',
                    tileSize: 256,
                    transition: 0,
                    opaque: false
                })],
                operation: (pixels, data) => {
                    const pixel = pixels[0]
                    if (pixel[3] === 0) return pixel
                    const key = this.pixel2key(pixel)
                    let props = mapcolor.get(key)
                    return props ? props.color : pixel
                },
                threads: 0
            }),
            transitions: 0
        })
    }
    static from(xyzurl) {
        const promises = [ThematicLayer.loadfunc(xyzurl), ThematicLayer.loaddata(xyzurl)]
        return Promise.all(promises)
            .then(arr => new ThematicLayer(xyzurl, arr[0], arr[1]))
            .catch(err => {
                console.error(`Unable to construct ThematicLayer due to :${err.message}`)
                return Promise.resolve()
            })
    }
    static loadfunc(xyzurl) {
        return new Promise((resolve, reject) => {
            fetch(xyzurl + '.js')
                .then(resp => resp.text())
                .then(fctxt => {
                    try {
                        const func = eval(`(${fctxt})`)
                        const type = typeof func
                        if (type === 'function') return resolve(func)
                        reject(new Error(`${xyzurl}.js must provide a function. ${type} was provided`))
                    } catch (e) {
                        reject(new Error(`${xyzurl}.js execution fail due to : ${e.message}`))
                    }
                })
        })
    }
    static loaddata(xyzurl) {
        return fetch(xyzurl + '.json')
            .then(resp => resp.json())
            .then(data => {
                const mapcolor = new window.Map()
                if (!Array.isArray(data)) throw new Error(`loaded data is not an array`)
                data.forEach(kvp => mapcolor.set(kvp.key, { color: null, name: kvp.name }))
                return mapcolor
            })
            .catch(e => {
                throw new Error(`${xyzurl}.json load fail due to : ${e.message}`)
            })
    }
}

function initScribble(thematiclayer) {

    const debuglayer = new TileLayer({
        source: new TileDebug(),
        visible: false
    })

    const map = new olMap({
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

    const debugcheck = document.getElementById('debugcheck')
    const thematiccheck = document.getElementById('thematiccheck')

    debugcheck.onchange = function () { debuglayer.setVisible(this.checked) }
    thematiccheck.onchange = function () { thematiclayer.setVisible(this.checked) }
    debugcheck.checked = debuglayer.getVisible()
    thematiccheck.checked = thematiclayer.getVisible()
}

ThematicLayer.from(xyzurl)
    .then(thlayer => {
        if (thlayer) {
            thlayer.mapcolor.forEach((v, k) => {
                const r = Math.ceil(Math.random() * 256)
                const g = Math.ceil(Math.random() * 256)
                const b = Math.ceil(Math.random() * 256)
                v.color = [r, g, b, 255]
            })
            initScribble(thlayer)
        }
    })


