var options = {
	seed: getRandomInt(0, Math.pow(2, 32)),//11,
	origin_x: 0,
	origin_y: 0,
	cell_size: 7,
	gutter_size: 0,
	drawWalls: false,
	wallColor: "black",
	wallWidth: 1,
	outline: false,
	startColor: {
		r: 0,
		g: 0,
		b: 0
	},
	endColor: {
		r: 0,
		g: 0,
		b: 0
	},
	randomStart: true,
	startX: 0,
	startY: 0,
	colorMode: 1,
	showStart: false,
	animSpeed: 1,
	animColor: true,
}

var colorOpts = {
	reset 	: true,
	sc_from : { r: 0, g: 0, b:0 },   //original start color
	sc_to   : { r: 0, g: 0, b:0 },   //new start color
	ec_from : { r: 0, g: 0, b:0 },   //original end color
	ec_to   : { r: 0, g: 0, b:0 },   //new end color
	lerp_perc: 0 //lerp percentage (how far through the lerp we are)
}

var seed = options.seed;  //40
var maze, canvas, context;

function zeroStart() {
	options.startX = 0;
	options.startY = 0;
	init(options);
}

//These values will be set to random in resize
function randomStart() {
	var d = calculateMazeDimensions()
	options.startX = getRandomInt(0, d.x);
	options.startY = getRandomInt(0, d.y);
	init(options);
}

function randomSeed() {
	$('#seed')[0].value = options.seed = getRandomInt(0, 1000000000);
	init(options);
}

function showhide() {
	$('#menu').toggle();
}

var animId;
var anim = false;
function toggleAnimate() {
	if(anim)
		stopAnim();
	else
		startAnim();
}

function stopAnim() {
	$('#animate').html('play');
	anim = false;
	if(animId != undefined)
		window.clearInterval(animId)
}

function startAnim() {
	$('#animate').html('pause');
	anim = true;
	animId = window.setInterval(function(){
		animateFrame();
	}, 50);
}

function animateFrame() {
	if(options.animColor)
		shiftColor(options.animSpeed, false);

	if(maze != undefined && context != undefined) {
		maze.draw(context, options, options.animSpeed / 100);
	}
}

//Sets new taret colors and lerps the current colors to them, restarting when
// the target and current colors are the same
function shiftColor(shift, redraw) {
	if(colorOpts.reset) {
		colorOpts.reset = false;
		colorOpts.lerp_perc = 0;
		copyColor(options.startColor, colorOpts.sc_from);
		copyColor(options.endColor, colorOpts.ec_from);
		colorOpts.sc_to = randomSeededColor();
		colorOpts.ec_to = randomSeededColor();
	}

	if(colorOpts.lerp_perc >= 100) {
		copyColor(colorOpts.ec_to, colorOpts.ec_from);
		colorOpts.ec_to = randomSeededColor();

		copyColor(colorOpts.sc_to, colorOpts.sc_from);
		colorOpts.sc_to = randomSeededColor();

		colorOpts.lerp_perc = 0
	}

	colorOpts.lerp_perc += shift;

	options.startColor = lerp_color(colorOpts.sc_from,
									colorOpts.sc_to,
									colorOpts.lerp_perc);
	options.endColor = lerp_color(colorOpts.ec_from,
								  colorOpts.ec_to,
								  colorOpts.lerp_perc);

	if(redraw && maze != undefined && context != undefined) {
		maze.draw(context, options, 0);
	}
}

function checkOpts() {
	if(parseInt($('#seed')[0].value) != NaN)
		options.seed = parseInt($('#seed')[0].value);
	if(parseInt($('#size')[0].value) != NaN)
		options.cell_size = parseInt($('#size')[0].value);
	if(parseInt($('#animSpeed')[0].value) != NaN)
		options.animSpeed = parseInt($('#animSpeed')[0].value);
	options.colorMode = $('#cyclicColor')[0].checked ? 1 : 0;
	options.drawWalls = options.outline = $("#walls")[0].checked;
	options.randomStart = $("#randomStart")[0].checked;
	options.animColor = $("#animateColor")[0].checked;
	if(options.randomStart) {
		$('#startCoords').hide();
	} else {
		$('#startCoords').show();
	}

	if(parseInt($('#startX')[0].value) != NaN)
		options.startX = parseInt($('#startX')[0].value);
	if(parseInt($('#startY')[0].value) != NaN)
		options.startY = parseInt($('#startY')[0].value);

	init(options);
}

function setUi() {
	$('#size')[0].value = options.cell_size;
	$('#seed')[0].value = options.seed;
	$('#cyclicColor')[0].checked = options.colorMode == 1;
	$('#randomStart')[0].checked = options.randomStart;
	$('#animSpeed')[0].value = options.animSpeed;
	$('#animateColor')[0].checked = options.animColor;
	if(options.randomStart) {
		$('#startCoords').hide();
	}
}

$( document ).ready(function() {
	$('input').bind('click keyup', function(){
		checkOpts();
	});

	setUi();

	canvas = $('#canvas')[0],
	context = canvas.getContext('2d');

	window.addEventListener('resize', function(){ init(options); }, false);
	init(options);
});

function calculateMazeDimensions() {
	var dim = { x: 0, y: 0 };

	if(canvas != undefined) {
		dim.x = Math.floor(canvas.width / (options.cell_size + options.gutter_size));
		dim.y = Math.floor(canvas.height / (options.cell_size + options.gutter_size));
	}

	return dim;
}

function init(options) {
	var wasAnim = false;
	if(anim) {
		console.log('toggling anim');
		wasAnim = true;
		toggleAnimate();
	}

	if(canvas == undefined || context == undefined)
		return;

	verifyOptions();

	seed = options.seed;

	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;

	$('#canvas').css("background-color", options.wallColor);

	var d = calculateMazeDimensions();

	options.startColor = randomSeededColor();
	options.endColor = randomSeededColor();

	colorOpts.reset = true;

	maze = new Maze(d.x, d.y, options);

	maze.draw(context, options);

	if(wasAnim) {
		toggleAnimate();
	}
}

function Vertex (x, y) {
	this.x = x;
	this.y = y;
	this.visited = false;
	this.adj = [];
	this.walls = [];
	this.depth = 1;

	//removes the wall between this and vertex, adding it to the adjacency list
	this.breakWall = function(vertex, log) {
		var index = -1;
		this.walls.forEach(function(v, i){
			if(v.y == vertex.y && v.x == vertex.x) {
				if(log)
					console.log('\tmatch found at index: ' + i);
				index = i;
			}
		});
		this.adj.push(this.walls.splice(index, 1)[0]);
	}

	//draw function for display
	this.draw = function (context, o, shiftDepth, maxDepth) {
		//do depth shifting (animation) in here to avoid looping twice
		if(shiftDepth != 0) {
			this.depth = Math.floor((this.depth + shiftDepth) % maxDepth);
		}

		var ww = o.drawWalls ? o.wallWidth : 0;
		var vX = ww + o.origin_x + (o.cell_size + o.gutter_size) * x,
			vY = ww + o.origin_y + (o.cell_size + options.gutter_size) * y;
		var cR, cG, cB, colorMod;

		switch(o.colorMode){
			case 0: //End to end color
				colorMod = this.depth/o.maxDepth;
				break;
			case 1: //Cyclic color
				if(this.depth < (o.maxDepth/2))
					colorMod = this.depth/o.maxDepth/0.5;
				else
					colorMod = (1 - (this.depth/o.maxDepth))/0.5;
				break;
			/*
			case 2:
				colorMod = (this.depth/o.maxDepth/0.5) - 0.5;
				break;
			case 3:
				colorMod = 0.5 - (this.depth/o.maxDepth);
				break;
			*/
		}

		var start = {
				r: Math.floor(o.startColor.r),
				g: Math.floor(o.startColor.g),
				b: Math.floor(o.startColor.b)
			},
			end = {
				r: Math.floor(o.endColor.r),
				g: Math.floor(o.endColor.g),
				b: Math.floor(o.endColor.b)
			}

		var cR = Math.floor(start.r + (end.r - start.r) * colorMod),
			cG = Math.floor(start.g + (end.g - start.g) * colorMod),
			cB = Math.floor(start.b + (end.b - start.b) * colorMod);

		//Color the starting cell red
		//if(options.showStart && x == options.startX && y == options.startY) {
		//    console.log("x: "  + x + " y: " + y);
		//    cR = 255;
		//    cB = cG = 0;
		//}

		//fill
		context.fillStyle = "rgb("+ cR + "," + cG + "," + cB + ")";
		context.fillRect(vX, vY, o.cell_size, o.cell_size);

		/* Show depth numbers on cells
		context.fillStyle = "white";
		context.font = "10px Arial";
		context.fillText(this.depth,vX,vY + 10);
		//*/
	}

	this.drawWalls = function(context, options) {
		var vX = options.wallWidth + options.origin_x + (options.cell_size + options.gutter_size) * x,
			vY = options.wallWidth + options.origin_y + (options.cell_size + options.gutter_size) * y;

		context.fillStyle = options.wallColor;
		var w = options.wallWidth;

		this.walls.forEach(function(wall){
			if(wall.x == x - 1 && wall.y == y) { //left
				context.fillRect(
					vX - w - options.gutter_size,
					vY - w - options.gutter_size,
					(2 * w) + options.gutter_size,
					(2 * w) + (2 * options.gutter_size) + options.cell_size
				);
			} else if(wall.x == x && wall.y == y - 1) { // top
				context.fillRect(
					vX - w - options.gutter_size,
					vY - w - options.gutter_size,
					(2 * w) + (2 * options.gutter_size) + options.cell_size,
					(2 * w) + options.gutter_size
				);
			}
		});
	}
};

function Maze (w, h, options) {
	this.w = w;
	this.h = h;

	//setup the grid
	this.grid = new Array(h);
	for(var g_y = 0; g_y < this.grid.length; g_y++) {
		this.grid[g_y] = new Array(w);
		for(var g_x = 0; g_x < this.grid[g_y].length; g_x++) {
			this.grid[g_y][g_x] = new Vertex(g_x, g_y);

			if(g_x > 0) {       //left
				this.grid[g_y][g_x].walls.push({ x: g_x - 1, y: g_y });
			} if(g_x < w - 1) { //right
				this.grid[g_y][g_x].walls.push({ x: g_x + 1, y: g_y });
			} if(g_y > 0) {     //top
				this.grid[g_y][g_x].walls.push({ x: g_x, y: g_y - 1 });
			} if(g_y < h - 1) { //bottom
				this.grid[g_y][g_x].walls.push({ x: g_x, y: g_y + 1});
			}
		}
	}

	//Returns a random unvisited neighbor of the given vertex
	this.randomWalledNeighbor = function(grid, vertex) {
		var valid = vertex.walls.filter(function(v){
			return !grid[v.y][v.x].visited;
		});

		if(valid.length < 1)
			return -1;

		return valid[getRandomSeededInt(0, valid.length)];
	}

	//Mazify - see http://www.algosome.com/articles/maze-generation-depth-first.html
	//1 Randomly select a node (or cell) N.
	var n = { x: 0, y: 0 },
		q = [];
	while(n != null) {
		//2 Push the node N onto a queue Q.
		q.push(n);

		//3 Mark the cell N as visited.
		this.grid[n.y][n.x].visited = true;

		//4 Randomly select an adjacent cell A of node N that has not been visited.
		var neighbor = this.randomWalledNeighbor(this.grid, this.grid[n.y][n.x]);
		while (neighbor == -1) {
			//If all the neighbors of N have been visited:
			//  Continue to pop items off the queue Q until a node is
			//      encountered with at least one non-visited neighbor - assign
			//      this node to N and go to step 4.
			//  If no nodes exist: stop.
			if(q.length <= 1)
				break;

			q.shift();
			n = q[0];
			neighbor = this.randomWalledNeighbor(this.grid, this.grid[q[0].y][q[0].x]);
		}

		if(q.length <= 1 && neighbor == -1)
			break;

		//5 Break the wall between N and A.
		this.grid[n.y][n.x].breakWall(neighbor);
		this.grid[neighbor.y][neighbor.x].breakWall(n);

		//6 Assign the value A to N.
		n = neighbor;

		//7 Go to step 2.
	}

	//Run a DFS on the resulting maze to generate the depth values
	// use visited as though it were inverse as it was flipped in the generation algo
	this.maxDepth = 0;
	var v = {};

	//We always need to generate these, otherwise we lose seed consistency
	v.x = getRandomSeededInt(0, w);
	v.y = getRandomSeededInt(0, h);

	if(options.randomStart == false) {
		v = {x: options.startX, y:options.startY};
	} else {
		options.startX = v.x;
		options.startY = v.y;
	}

	$('#startX')[0].value = v.x;
	$('#startY')[0].value = v.y;

	// use iterative dfs to avoid js callstack limits
	v.d = 0;
	iterDFS(this, v);
	function iterDFS (maze, v) {
		var s = [];
		s.push(v);
		while(s.length > 0) {
			v = s.pop();
			if(maze.grid[v.y][v.x].visited == true) {
				maze.grid[v.y][v.x].visited = false;
				maze.grid[v.y][v.x].depth = v.d
				if(v.d > maze.maxDepth)
					maze.maxDepth = v.d;
				maze.grid[v.y][v.x].adj.forEach(function(a){
					s.push( { x: a.x, y: a.y, d: v.d + 1 } );
				});
			}
		}
	}

	//Draw function for display
	this.draw = function (context, options, shiftDepth) {
		if(shiftDepth == undefined)
			shiftDepth = 0;
		else
			shiftDepth *= this.maxDepth;

		//add room for gutters and walls to origin
		options.origin_x += options.gutter_size;
		options.origin_y += options.gutter_size;

		options.maxDepth = this.maxDepth;

		//Clear the canvas
		//context.clearRect(0, 0, canvas.width, canvas.height);

		//draw squares
		for(var y = 0; y < this.grid.length; y++) {
			for(var x = 0; x < this.grid[y].length; x++) {
				this.grid[y][x].draw(context, options, shiftDepth, this.maxDepth);
			}
		}

		//Draw walls seperately to avoid overlap
		if(options.drawWalls) {
			for(var y = 0; y < this.grid.length; y++) {
				for(var x = 0; x < this.grid[y].length; x++) {
					this.grid[y][x].drawWalls(context, options);
				}
			}
		}

		//Draw an outline around the grid
		if(options.outline == true) {
			context.lineWidth = options.wallWidth * 2;
			context.strokeStyle = options.wallColor;
			context.strokeRect( options.origin_x + (options.drawWalls ? options.wallWidth : 0),// - options.wallWidth,
								options.origin_y + (options.drawWalls ? options.wallWidth : 0),// - options.wallWidth
								(options.cell_size + options.gutter_size) * this.grid[0].length,
								(options.cell_size + options.gutter_size) * this.grid.length
			);
		}
	}
}

function verifyOptions() {
	//Default some options
	if(options.origin_x == undefined)
		options.origin_x = 0;
	if(options.origin_y == undefined)
		options.origin_y = 0;
	if(options.cell_size == undefined)
		options.cell_size = 5;
	if(options.gutter_size == undefined)
		options.gutter_size = 0;
	if(options.startColor == undefined)
		options.startColor = {
			red: 0,
			green: 153,
			blue: 0
		};
	if(options.endColor == undefined)
		options.endColor = {
			red: 0,
			green: 255,
			blue: 153
		};
	if(options.wallWidth == undefined)
		options.wallWidth = 1;
	if(options.wallColor == undefined)
		options.wallColor = "black";
}


//================== Utility =================
//http://stackoverflow.com/questions/10673122/how-to-save-canvas-as-an-image-with-canvas-todataurl
function saveToDisk() {
	if(canvas != undefined) {
		 // here is the most important part because if you dont replace you will get a DOM 18 exception.
		var image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
		window.location.href=image; // it will save locally
	}
}

//https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
// Returns a random integer between min (included) and max (included)
// Using Math.round() will give you a non-uniform distribution!
function getRandomSeededInt(min, max) {
	return Math.floor(random() * (max - min)) + min;
}

// Returns a random integer between min (included) and max (excluded)
// Using Math.round() will give you a non-uniform distribution!
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

//http://stackoverflow.com/questions/521295/javascript-random-seeds
// rpovides seeded random values
function random() {
	var x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
}

function randomSeededColor() {
	return {
		r: getRandomSeededInt(0, 255),
		g: getRandomSeededInt(0, 255),
		b: getRandomSeededInt(0, 255)
	};
}

function randomColor() {
	return {
		r: getRandomInt(0, 255),
		g: getRandomInt(0, 255),
		b: getRandomInt(0, 255)
	};
}

function max(i1, i2) {
	return (i1 > i2) ? i1 : i2;
}

function min(i1, i2) {
	return (i1 < i2) ? i1 : i2;
}

//returns the color which is p between c1 and c2
function lerp_color(c1, c2, p) {
	var d = p/100;
	var r = {
		r: c1.r + ((c2.r - c1.r) * d),
		g: c1.g + ((c2.g - c1.g) * d),
		b: c1.b + ((c2.b - c1.b) * d),
	}
	return r;
}

function copyColor(from, to) {
	to.r = from.r;
	to.g = from.g;
	to.b = from.b;
}

function sameColor(c1, c2) {
	return c1.r == c2.r && c1.g == c2.g && c1.b == c2.b;
}