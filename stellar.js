// constants
WIDTH = 800
HEIGHT = 600
PI = 3.14159
MOUSE_SENSITIVITY = 0.003
DOT_SIZE = 4
let dotResize = false
let orthogonal = false

// initialize
let canvas = document.getElementById("maincanvas")
let ctx = canvas.getContext("2d")

let tmpCanvas = document.createElement('canvas');
let tmpCanvasCtx = tmpCanvas.getContext('2d')
ctx.canvas.height = HEIGHT
ctx.canvas.width = WIDTH

let cameraDistance = 3
let cameraTheta = 60 / 180 * PI
let cameraPhi = 30 / 180 * PI
let scale = 270
let dragState = {
  enabled: false,
  oTheta: 0,
  oPhi: 0,
  startX: 0,
  startY: 0
}
let backgroundColor = '#80a0d0'
let drawBorder = false

function vecAdd(a, b) {
  return [a[0]+b[0], a[1]+b[1], a[2]+b[2]]
}

function vecSub(a, b) {
  return [a[0]-b[0], a[1]-b[1], a[2]-b[2]]
}

function vecDot(a, b) {
  return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
}

function length(p) {
  return Math.sqrt(vecDot(p, p))
}

function vecCross(a, b) {
  return [
    a[1]*b[2]-a[2]*b[1],
    a[2]*b[0]-a[0]*b[2],
    a[0]*b[1]-a[1]*b[0]
  ]
}

// scalar b * vec a
function vecMul(b, a) {
  return [a[0]*b, a[1]*b, a[2]*b]
}

function normalize(p) {
  return vecMul(1/length(p), p)
}

function vecNeg(a) {
  return [-a[0], -a[1], -a[2]]
}

function projectToScreen(point, theta, phi, cDistance) {
  let normal = [Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)]
  let cameraOrigin = vecMul(cDistance, normal)
  let displacement = vecSub(point, cameraOrigin)
  let distance = -vecDot(displacement, normal)
  let projected = vecAdd(displacement, vecMul(-distance, normal))
  let right = [-Math.sin(theta), 0, Math.cos(theta)]
  let up = vecCross(normal, right)
  let x = 0, y = 0
  if (orthogonal) {
    x = WIDTH / 2 + scale*vecDot(right, projected)
    y = HEIGHT / 2 + scale*vecDot(up, projected)
  } else {
    x = WIDTH / 2 + scale*vecDot(right, projected) * cDistance / distance
    y = HEIGHT / 2 + scale*vecDot(up, projected) * cDistance / distance
  }
  // console.log(x, y)
  return [x, y, distance]
}

function canvasDown(event) {
  let x = event.pageX
  let y = event.pageY
  dragState = {
    enabled: true,
    oTheta: cameraTheta,
    oPhi: cameraPhi,
    startX: x,
    startY: y
  }
}

function canvasMove(event) {
  if (!dragState.enabled) return
  let x = event.pageX
  let y = event.pageY
  cameraTheta = dragState.oTheta - (x-dragState.startX) * MOUSE_SENSITIVITY
  cameraPhi = dragState.oPhi + (y-dragState.startY) * MOUSE_SENSITIVITY
  if (cameraPhi > PI/2) cameraPhi = PI/2
  if (cameraPhi < -PI/2) cameraPhi = -PI/2
}

function canvasUp(event) {
  dragState.enabled = false
}

function generatePoint(theta, phi, colorGenerator) {
  let p;
  while (true) {
    p = [Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1]
    if (length(p) <= 1) break
  }
  let projection = projectToScreen(p, theta, phi, cameraDistance)
  let x = projection[0], y = projection[1]
  let color = colorGenerator(x, y);
  // if (x<threshold && x>-threshold && y<threshold && y>-threshold) {
  //   let _sc = (t) => {return Math.floor((t/threshold/2+0.5) * 230)}
  //   color = `rgb(${_sc(x)}, ${0}, ${_sc(x)})`
  // } else {
  //   let _sc = () => {return Math.floor(Math.random() * 230)}
  //   color = `rgb(${_sc()}, ${_sc()}, ${_sc()})`
  // }
  return [p, color]
}

let vertices = [];
//  = generatePoints((x, y) => {
//   let r = Math.floor(100 + 130 * (x/WIDTH))
//   let g = Math.floor(100 + 130 * (y/HEIGHT))
//   return `rgb(${r}, ${g}, 0)`
// })

function drawCircle(x, y, radius, color) {
  ctx.beginPath()
  ctx.arc(x, y, radius, 0, 2*Math.PI, false)
  ctx.closePath()
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.fill()
  if (drawBorder) ctx.stroke()
}

function redraw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.strokeStyle = document.getElementById("strokeStyleInput").value
  drawBorder = (document.getElementById("strokeStyleInput").value != "")
  canvas.style.backgroundColor = backgroundColor
  projected = []
  vertices.forEach((v) => {
    let p = projectToScreen(v[0], cameraTheta, cameraPhi, cameraDistance)
    projected.push([p, v[1]])
  })
  projected.sort((a, b) => {return -a[0][2]+b[0][2]})
  let dotSize = document.getElementById("numberDotSize").value
  let filter = document.getElementById("filterTargetInput").value
  let filterEnabled = filter != ""
  let allowedDifference = 0
  if (filter != "") {
    let filterRGB = filter.split(",")
    filter = [Number(filterRGB[0]), Number(filterRGB[1]), Number(filterRGB[2])]
    allowedDifference = Number(document.getElementById("filterDiffInput").value)
  }
  let noOutside = document.getElementById("noOutsideCheckbox").checked
  let filterInverse = document.getElementById("filterInverseCheckbox").checked
  projected.forEach((v) => {
    let p = v[0], c = v[1]
    if (noOutside && c[3]) return 
    if (filterEnabled) {
      let dif = Math.sqrt((
        (c[0] - filter[0])*(c[0] - filter[0]) + 
        (c[1] - filter[1])*(c[1] - filter[1]) + 
        (c[2] - filter[2])*(c[2] - filter[2])
      )/3)
      if ((dif > allowedDifference) ^ filterInverse) return
    }
    let size = (dotResize) ? (dotSize * cameraDistance / p[2]) : dotSize
    drawCircle(p[0], p[1], size, c)
  })
}

function deleteFilteredClick() {
  let filtered = []
  let filter = document.getElementById("filterTargetInput").value
  let filterEnabled = filter != ""
  let allowedDifference = 0
  if (filter != "") {
    let filterRGB = filter.split(",")
    filter = [Number(filterRGB[0]), Number(filterRGB[1]), Number(filterRGB[2])]
    allowedDifference = Number(document.getElementById("filterDiffInput").value)
  }
  let noOutside = document.getElementById("noOutsideCheckbox").checked
  let filterInverse = document.getElementById("filterInverseCheckbox").checked
  vertices.forEach((v) => {
    let p = v[0], c = v[1]
    if (noOutside && c[3]) return 
    if (filterEnabled) {
      let dif = Math.sqrt((
        (c[0] - filter[0])*(c[0] - filter[0]) + 
        (c[1] - filter[1])*(c[1] - filter[1]) + 
        (c[2] - filter[2])*(c[2] - filter[2])
      )/3)
      if ((dif > allowedDifference) ^ filterInverse) return
    }
    filtered.push(v)
  })
  vertices = filtered
  document.getElementById("promptParagraph").innerText = `${vertices.length} points remain.`
}

function update() {
  redraw()
}

function generateIntersectSphere(origin, direction) {
  //console.log(origin, direction)
  let footDist = -vecDot(origin, direction)
  let dist = length(origin)
  //console.log(footDist, dist)
  if (dist*dist - footDist*footDist < 0) return null
  let footHeight = Math.sqrt(dist*dist - footDist*footDist)
  //console.log(footHeight)
  if (1-footHeight*footHeight < 0) return null
  let innerLength = Math.sqrt(1-footHeight*footHeight) * 2
  let t = Math.random() * innerLength + footDist - innerLength / 2
  return vecAdd(origin, vecMul(t, direction))
}

// console.log(generateIntersectSphere(
// [ -0.12985587539335197, -0.5380921736847513, 2.9484901668896653 ],
// [ 0.03787966279924325, 0.13550439627176727, -0.990052367169151 ]
// ))

function generatePixelPoints(theta, phi, image, imageData, xMargin, yMargin, width, height) {
  let getColor = (x, y) => {
    let i; let outside = false;
    if (x<0 || y<0 || x>=image.width || y>=image.height) {
      i = 4 * (Math.floor(Math.random() * image.width) + Math.floor(Math.random() * image.height) * image.width)
      outside = true
    }
    else i = 4 * (y * image.width + x)
    return [imageData[i], imageData[i+1],imageData[i+2], outside]
  }
  let normal = [Math.cos(phi) * Math.cos(theta), Math.sin(phi), Math.cos(phi) * Math.sin(theta)]
  let cameraOrigin = vecMul(cameraDistance, normal)
  let right = [-Math.sin(theta), 0, Math.cos(theta)]
  let up = vecCross(normal, right)
  let down = vecNeg(up) 
  //console.log(normal, cameraOrigin, right, up, down)
  let vertices = []
  let interval = Number(document.getElementById("intervalGrid").value)
  for (let i=0; i<WIDTH; i+=interval) {
    for (let j=0; j<HEIGHT; j+=interval) {
      let dx = (i - WIDTH/2)/scale
      let dy = (HEIGHT - j - HEIGHT/2)/scale
      //console.log(dx, dy)
      let origin, direction;
      if (orthogonal) {
        origin = vecAdd(cameraOrigin, vecAdd(vecMul(dx, right), vecMul(dy, down)))
        direction = vecNeg(normal)
      } else {
        origin = cameraOrigin
        direction = normalize(vecSub(vecAdd(vecMul(dx, right), vecMul(dy, down)), cameraOrigin))
      }
      //console.log(dx, dy, origin, direction, vecSub(vecAdd(vecMul(dx, right), vecMul(dy, down)), cameraOrigin))
      let vertex = generateIntersectSphere(origin, direction)
      if (vertex != null) vertices.push([vertex, getColor(Math.floor((i-xMargin)/width*image.width), Math.floor((j-yMargin)/height*image.height))])
    }
  }
  return vertices
}

function generatePoints(colorGenerator, image, imageData, xMargin, yMargin, width, height) {
  let theta = Math.random() * 2 * PI, phi = Math.random() * PI - PI/2;
  // console.log(theta / PI * 180, phi / PI * 180)
  let randomPoints = []
  let scatterCount = Number(document.getElementById("numberScatter").value)
  for (let i=0; i<scatterCount; i++) {
    randomPoints.push(generatePoint(theta, phi, colorGenerator))
  }
  let useGrid = document.getElementById("useGridCheckbox").checked
  if (useGrid) {
    let gridPoints = generatePixelPoints(theta, phi, image, imageData, xMargin, yMargin, width, height)
    document.getElementById("promptParagraph").innerText = `Got ${gridPoints.length} grid points, and ${randomPoints.length} scattered points.`
    return randomPoints.concat(gridPoints)
  } else {
    document.getElementById("promptParagraph").innerText = `Got ${randomPoints.length} scattered points.`
    return randomPoints
  }
}

function sourceSubmitClick() {
  PADDING = 0.1
  let xmar = WIDTH * PADDING
  let ymar = HEIGHT * PADDING
  let twidth = WIDTH - xmar * 2
  let theight = HEIGHT - ymar * 2
  let image = new Image()
  image.src = document.getElementById("sourceInput").value
  image.crossOrigin = 'anonymous'
  console.log(image.src)
  image.onerror = (e) => {console.log(e)}
  image.onload = function () {
    tmpCanvas.width = image.width
    tmpCanvas.height = image.height
    tmpCanvasCtx.drawImage(image, 0, 0)
    console.log("Drawn image")
    let imgData = tmpCanvasCtx.getImageData(0, 0, image.width, image.height).data
    // calculate background color
    let sum = [0, 0, 0]
    for (let i=0; i<imgData.length; i+=4) {
      for (let j=0; j<3; j++) sum[j] += imgData[i+j]
    }
    for (let j=0; j<3; j++) sum[j] = sum[j] / imgData.length * 4
    if (sum[0]+sum[1]+sum[2] < 374) {for (let j=0; j<3; j++) sum[j]=255-(255-sum[j]) * 0.7}
    else {for (let j=0; j<3; j++) sum[j]=0.7*sum[j]}
    for (let j=0; j<3; j++) sum[j] = Math.floor(sum[j])
    backgroundColor = `rgb(${sum[0]}, ${sum[1]}, ${sum[2]})`
    let colorGenerator = (x, y) => {
      let getColor = (x, y) => {
        let i = 4 * (y * image.width + x)
        return [imgData[i], imgData[i+1],imgData[i+2], false]
      }
      let randomSampler = () => {
        let ret = getColor(Math.floor(Math.random() * image.width), Math.floor(Math.random() * image.height))
        ret[3] = true
        return ret
        //return `#ff0000`
      }
      if (image.width / image.height > WIDTH / HEIGHT) {
        let margin = (theight - twidth / image.width * image.height) / 2
        if (y <= ymar + margin || y >= HEIGHT - ymar - margin || x <= xmar || x >= WIDTH - xmar) return randomSampler()
        else return getColor(Math.floor((x - xmar) / twidth * image.width), Math.floor((y-ymar-margin) / twidth * image.width))
      } else {
        let margin = (twidth - theight / image.height * image.width) / 2
        if (x <= xmar + margin || x >= WIDTH - xmar - margin || y <= ymar || y >= HEIGHT - ymar) return randomSampler()
        else return getColor(Math.floor((x-xmar-margin) / theight * image.height), Math.floor((y - ymar) / theight * image.height))
      }
    }
    if (image.width / image.height > WIDTH / HEIGHT) {
      let margin = (theight - twidth / image.width * image.height) / 2
      vertices = generatePoints(colorGenerator, image, imgData, xmar, ymar+margin, twidth, twidth / image.width * image.height)
    } else {
      let margin = (twidth - theight / image.height * image.width) / 2
      vertices = generatePoints(colorGenerator, image, imgData, xmar+margin, ymar, theight / image.height * image.width, theight)
    }
  }
}

setInterval("update()", 50)

function orthogonalChanged() {
  orthogonal = document.getElementById("orthogonalCheckbox").checked
}

function dotResizeChanged() {
  dotResize = document.getElementById("dotResizeCheckbox").checked
}

/*
How to run:
python -m http.server 3000
then open in browser: localhost:3000/stellar.html
*/