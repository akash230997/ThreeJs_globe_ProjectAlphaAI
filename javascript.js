
var config = {
    percent: 0,
    lat: 0,
    lng: 0,
    segX: 14,
    segY: 12,
    isHaloVisible: true,
    isPoleVisible: true,
    autoSpin: true,
    zoom: 0,
    skipPreloaderAnimation: false,
    goToHongKong: function () {
        goTo(22.28556, 114.15769);
    }
};

var stats;
var imgs;
var preloader;
var preloadPercent;
var globeDoms;
var vertices;

var world;
var worldBg;
var globe;
var globeContainer;
var globePole;
var globeHalo;

var pixelExpandOffset = 1.5;
var rX = 0;
var rY = 0;
var rZ = 0;
var sinRX;
var sinRY;
var sinRZ;
var cosRX;
var cosRY;
var cosRZ;
var dragX;
var dragY;
var dragLat;
var dragLng;

var isMouseDown = false;
var isTweening = false;
var tick = 1;

var URLS = {
    // bg: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/6043/css_globe_bg.jpg',
    bg: 'https://r4.wallpaperflare.com/wallpaper/694/865/147/space-art-fantasy-art-sky-clouds-wallpaper-68165d18b0a06ca8208cc1fec83254ba.jpg',
    diffuse: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/6043/css_globe_diffuse.jpg',
    halo: 'https://s3-us-west-2.amazonaws.com/s.cdpn.io/6043/css_globe_halo.png',
};

var transformStyleName = PerspectiveTransform.transformStyleName;
// console.log(transformStyleName)

function init(ref) {

    world = document.querySelector('.world');
    worldBg = document.querySelector('.world-bg');
    worldBg.style.backgroundImage = 'url(' + URLS.bg + ')';
    globe = document.querySelector('.world-globe');
    globeContainer = document.querySelector('.world-globe-doms-container');
    globePole = document.querySelector('.world-globe-pole');
    globeHalo = document.querySelector('.world-globe-halo');
    globeHalo.style.backgroundImage = 'url(' + URLS.halo + ')';


    regenerateGlobe();

    // var gui = new dat.GUI();
    // gui.add(config, 'lat', -90, 90).listen();
    // gui.add(config, 'lng', -180, 180).listen();
    // gui.add(config, 'isHaloVisible');
    // gui.add(config, 'isPoleVisible');
    // gui.add(config, 'autoSpin');
    // // gui.add(config, 'goToHongKong');
    // gui.add(config, 'zoom', 0, 1).listen();

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = 0;
    stats.domElement.style.top = 0;

    // events
    world.ondragstart = function () { return false; };
    world.addEventListener('mousedown', onMouseDown);
    world.addEventListener('mousemove', onMouseMove);
    world.addEventListener('mouseup', onMouseUp);
    world.addEventListener('touchstart', touchPass(onMouseDown));
    world.addEventListener('touchmove', touchPass(onMouseMove));
    world.addEventListener('touchend', touchPass(onMouseUp));

    loop();
}

function touchPass(func) {
    return function (evt) {
        evt.preventDefault();
        func.call(this, { pageX: evt.changedTouches[0].pageX, pageY: evt.changedTouches[0].pageY });
    };
}

function onMouseDown(evt) {
    isMouseDown = true;
    dragX = evt.pageX;
    dragY = evt.pageY;
    dragLat = config.lat;
    dragLng = config.lng;
}

function onMouseMove(evt) {
    if (isMouseDown) {
        var dX = evt.pageX - dragX;
        var dY = evt.pageY - dragY;
        config.lat = clamp(dragLat + dY * 0.5, -90, 90);
        config.lng = clampLng(dragLng - dX * 0.5, -180, 180);
    }
}

function onMouseUp(evt) {
    if (isMouseDown) {
        isMouseDown = false;
    }
}

function regenerateGlobe() {
    var dom, domStyle;
    var x, y;
    globeDoms = [];
    while (dom = globeContainer.firstChild) {
        globeContainer.removeChild(dom);
    }

    var segX = config.segX;
    var segY = config.segY;
    var diffuseImgBackgroundStyle = 'url(' + URLS.diffuse + ')';
    var segWidth = 1600 / segX | 0;
    var segHeight = 800 / segY | 0;

    vertices = [];

    var verticesRow;
    var radius = (536) / 2;

    var phiStart = 0;
    var phiLength = Math.PI * 2;

    var thetaStart = 0;
    var thetaLength = Math.PI;

    for (y = 0; y <= segY; y++) {

        verticesRow = [];

        for (x = 0; x <= segX; x++) {

            var u = x / segX;
            var v = 0.05 + y / segY * (1 - 0.1);

            var vertex = {
                x: - radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength),
                y: -radius * Math.cos(thetaStart + v * thetaLength),
                z: radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength),
                phi: phiStart + u * phiLength,
                theta: thetaStart + v * thetaLength
            };
            verticesRow.push(vertex);
        }
        vertices.push(verticesRow);
    }

    for (y = 0; y < segY; ++y) {
        for (x = 0; x < segX; ++x) {
            dom = document.createElement('div');
            domStyle = dom.style;
            domStyle.position = 'absolute';
            domStyle.width = segWidth + 'px';
            domStyle.height = segHeight + 'px';
            domStyle.overflow = 'hidden';
            domStyle[PerspectiveTransform.transformOriginStyleName] = '0 0';
            domStyle.backgroundImage = diffuseImgBackgroundStyle;
            dom.perspectiveTransform = new PerspectiveTransform(dom, segWidth, segHeight);
            dom.topLeft = vertices[y][x];
            dom.topRight = vertices[y][x + 1];
            dom.bottomLeft = vertices[y + 1][x];
            dom.bottomRight = vertices[y + 1][x + 1];
            domStyle.backgroundPosition = (-segWidth * x) + 'px ' + (-segHeight * y) + 'px';
            globeContainer.appendChild(dom);
            globeDoms.push(dom);
        }
    }

}

function loop() {
    requestAnimationFrame(loop);
    stats.begin();
    render();
    stats.end();
}

function render() {

    if (config.autoSpin && !isMouseDown && !isTweening) {
        config.lng = clampLng(config.lng - 0.2);
    }

    rX = config.lat / 180 * Math.PI;
    rY = (clampLng(config.lng) - 270) / 180 * Math.PI;

    globePole.style.display = config.isPoleVisible ? 'block' : 'none';
    globeHalo.style.display = config.isHaloVisible ? 'block' : 'none';

    var ratio = Math.pow(config.zoom, 1.5);
    pixelExpandOffset = 1.5 + (ratio) * -1.25;
    ratio = 1 + ratio * 3;
    globe.style[transformStyleName] = 'scale3d(' + ratio + ',' + ratio + ',1)';
    ratio = 1 + Math.pow(config.zoom, 3) * 0.3;
    worldBg.style[transformStyleName] = 'scale3d(' + ratio + ',' + ratio + ',1)';

    transformGlobe();
}

function clamp(x, min, max) {
    return x < min ? min : x > max ? max : x;
}

function clampLng(lng) {
    return ((lng + 180) % 360) - 180;
}

function transformGlobe() {

    var dom, perspectiveTransform;
    var x, y, v1, v2, v3, v4, vertex, verticesRow, i, len;
    if (tick ^= 1) {
        sinRY = Math.sin(rY);
        sinRX = Math.sin(-rX);
        sinRZ = Math.sin(rZ);
        cosRY = Math.cos(rY);
        cosRX = Math.cos(-rX);
        cosRZ = Math.cos(rZ);

        var segX = config.segX;
        var segY = config.segY;

        for (y = 0; y <= segY; y++) {
            verticesRow = vertices[y];
            for (x = 0; x <= segX; x++) {
                rotate(vertex = verticesRow[x], vertex.x, vertex.y, vertex.z);
            }
        }

        for (y = 0; y < segY; y++) {
            for (x = 0; x < segX; x++) {
                dom = globeDoms[x + segX * y];

                v1 = dom.topLeft;
                v2 = dom.topRight;
                v3 = dom.bottomLeft;
                v4 = dom.bottomRight;

                expand(v1, v2);
                expand(v2, v3);
                expand(v3, v4);
                expand(v4, v1);

                perspectiveTransform = dom.perspectiveTransform;
                perspectiveTransform.topLeft.x = v1.tx;
                perspectiveTransform.topLeft.y = v1.ty;
                perspectiveTransform.topRight.x = v2.tx;
                perspectiveTransform.topRight.y = v2.ty;
                perspectiveTransform.bottomLeft.x = v3.tx;
                perspectiveTransform.bottomLeft.y = v3.ty;
                perspectiveTransform.bottomRight.x = v4.tx;
                perspectiveTransform.bottomRight.y = v4.ty;
                perspectiveTransform.hasError = perspectiveTransform.checkError();

                if (!(perspectiveTransform.hasError = perspectiveTransform.checkError())) {
                    perspectiveTransform.calc();
                }
            }
        }
    } else {
        for (i = 0, len = globeDoms.length; i < len; i++) {
            perspectiveTransform = globeDoms[i].perspectiveTransform;
            if (!perspectiveTransform.hasError) {
                perspectiveTransform.update();
            } else {
                perspectiveTransform.style[transformStyleName] = 'translate3d(-8192px, 0, 0)';
            }
        }
    }
}

function goTo(lat, lng) {
    var dX = lat - config.lat;
    var dY = lng - config.lng;
    var roughDistance = Math.sqrt(dX * dX + dY * dY);
    isTweening = true;
    TweenMax.to(config, roughDistance * 0.01, { lat: lat, lng: lng, ease: 'easeInOutSine' });
    TweenMax.to(config, 1, {
        delay: roughDistance * 0.01, zoom: 1, ease: 'easeInOutSine', onComplete: function () {
            isTweening = false;
        }
    });
}

function rotate(vertex, x, y, z) {
    x0 = x * cosRY - z * sinRY;
    z0 = z * cosRY + x * sinRY;
    y0 = y * cosRX - z0 * sinRX;
    z0 = z0 * cosRX + y * sinRX;

    var offset = 1 + (z0 / 4000);
    x1 = x0 * cosRZ - y0 * sinRZ;
    y0 = y0 * cosRZ + x0 * sinRZ;

    vertex.px = x1 * offset;
    vertex.py = y0 * offset;
}

// shameless stole and edited from threejs CanvasRenderer
function expand(v1, v2) {

    var x = v2.px - v1.px, y = v2.py - v1.py,
        det = x * x + y * y, idet;

    if (det === 0) {
        v1.tx = v1.px;
        v1.ty = v1.py;
        v2.tx = v2.px;
        v2.ty = v2.py;
        return;
    }

    idet = pixelExpandOffset / Math.sqrt(det);

    x *= idet; y *= idet;

    v2.tx = v2.px + x;
    v2.ty = v2.py + y;
    v1.tx = v1.px - x;
    v1.ty = v1.py - y;

}

init();

const marker_one = document.querySelector(".mark_one");
const marker_two = document.querySelector(".mark_two");
const marker_three = document.querySelector(".mark_three");
const marker_four = document.querySelector(".mark_four");
const marker_five = document.querySelector(".mark_five");
const home_btn = document.querySelector('.home-button');
// console.log(home_btn)
// console.log(marker_one);
// console.log(marker_two);
// console.log(marker_three);
// console.log(marker_four);
// console.log(marker_five);
marker_two.addEventListener('click', () => {
    const world_globe = document.querySelector(".world-globe");
    const markers = document.querySelector('.markers');
    const h1s = document.querySelector('.h1s');
    const world_bg = document.querySelector('.world-bg');
    const container_two = document.querySelector('.container_two');

    // console.log(markers);
    // console.log(world_globe);
    markers.style = "display: none;";
    container_two.style = "display: inline-block;";
    home_btn.style = "display: inline-block;";
    // world_bg.style = "background: black;";
    world_bg.style = "background-image: url('https://images-wixmp-ed30a86b8c4ca887773594c2.wixmp.com/f/9f3f9bd9-0673-4276-bb34-71ece2a5820e/dfrvyht-77d7dd2d-a558-4a4a-a494-bc21f7577818.png/v1/fill/w_1920,h_1098,q_80,strp/starry_sky_desktop_wallpaper__2___ai_art__by_3d1viner_dfrvyht-fullview.jpg?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTA5OCIsInBhdGgiOiJcL2ZcLzlmM2Y5YmQ5LTA2NzMtNDI3Ni1iYjM0LTcxZWNlMmE1ODIwZVwvZGZydnlodC03N2Q3ZGQyZC1hNTU4LTRhNGEtYTQ5NC1iYzIxZjc1Nzc4MTgucG5nIiwid2lkdGgiOiI8PTE5MjAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.EcE0Vn9w7i_2dr79sRituzzgDWShwMQ2auDiRZinXWA')";
    h1s.style = "display: none;";
    world_globe.style = "left:10%; top:20%;";
    console.log("mark two clicked!!");
})

marker_three.addEventListener('click', () => {
    const world_globe = document.querySelector(".world-globe");
    const markers = document.querySelector('.markers');
    const h1s = document.querySelector('.h1s');
    const world_bg = document.querySelector('.world-bg');
    const container_three = document.querySelector('.container_three');
    // console.log(markers);
    // console.log(world_globe);
    markers.style = "display: none;";
    home_btn.style = "display: inline-block;";
    container_three.style = "display: inline-block;";
    // world_bg.style = "background: black;";
    world_bg.style = "background-image: url('https://r4.wallpaperflare.com/wallpaper/647/209/213/ultrawide-space-space-art-wallpaper-3f65b20c6e361c1bb53c785201118434.jpg')";
    h1s.style = "display: none;";
    world_globe.style = "left:90%; top:10%;";
    console.log("mark two clicked!!");
})

marker_four.addEventListener('click', () => {
    const world_globe = document.querySelector(".world-globe");
    const markers = document.querySelector('.markers');
    const h1s = document.querySelector('.h1s');
    const world_bg = document.querySelector('.world-bg');
    const container_four = document.querySelector('.container_four');
    // console.log(markers);
    // console.log(world_globe);
    markers.style = "display: none;";
    home_btn.style = "display: inline-block;";
    container_four.style = "display: inline-block;";
    // world_bg.style = "background: black;";
    world_bg.style = "background-image: url('https://r4.wallpaperflare.com/wallpaper/1023/915/631/nasa-space-suit-digital-art-space-wallpaper-d9b0d87dd1fadddb462798dfa0c1e69d.jpg')";
    h1s.style = "display: none;";
    world_globe.style = "left:50%; top:10%;";
    console.log("mark two clicked!!");
})

// Socrates

const btn = document.querySelector('.btn');
console.log(btn)
// const loader = document.querySelector('.loader');
// document.getElementById("loader").style.display = "none";
// const filter = document.querySelector('.filter');

const hitModel = async () => {
    const valueget = document.getElementById('usersValue').value;
    const getDetails = document.querySelector('.getDetails');
    var Emptyy = document.querySelector('.empty');
    if (valueget === "") {
        getDetails.style.display = 'none';
        Emptyy.style.display = 'inline-block';
    }
    if (valueget !== "") {
        // document.getElementById("loader").style.display = "inline-block";
        Emptyy.style.display = 'none';
        console.log(valueget);
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: valueget,
            })
        })
        const obj = await response.json();
        if (obj.result?.length > 0) {
            myVar = setTimeout(showPage, 1000);
        }

        // const getDetails = document.querySelector('.getDetails');
        var getDetails2 = document.querySelector('#getDetails');
        var i = 0;
        var txt = obj.result;
        var speed = 20;
        console.log(txt + " -txt")
        function showPage() {
            // document.getElementById("loader").style.display = "none";
            getDetails.style.display = 'block';
            typeWritter()
            console.log('obj - ', obj);
        }
        function typeWritter() {
            if (i < txt.length) {
                getDetails2.innerHTML += txt.charAt(i);
                i++;
                setTimeout(typeWritter, speed);
            }
        }
        getDetails2.innerHTML = "";
    } else {
        document.getElementById("loader").style.display = "none";
        // Emptyy.style.display='inline-block';
    }
}
btn.addEventListener('click', hitModel);