Math.TAU = Math.PI*2;

///// LOAD IMAGES /////

var assetsCallback;
var onLoadAssets = function(callback){
	assetsCallback = callback;
	if(assetsLeft==0) assetsCallback();
};
var assetsLeft = 0;
var onAssetLoaded = function(){
	assetsLeft--;
	if(assetsLeft==0) assetsCallback();
};
var images = {};
function addAsset(name,src){
	assetsLeft++;
	images[name] = new Image();
	images[name].onload = onAssetLoaded;
	images[name].src = src;
}
function addSound(name,src){
	assetsLeft++;
	createjs.Sound.addEventListener("fileload", onAssetLoaded);
	createjs.Sound.registerSound({src:src, id:name});
}

//////////////

function Level(config,isIntro){
	var self = this;
	self.isIntro = isIntro;

	self.circles = config.circles;
	//矩形
	self.rect = config.rect;
	//三角形
	self.Triangle = config.Triangle;
	self.player = new Peep(config.player,self);
	self.key = new DoorKey(config.key, self);
	self.door = new Door(config.door, self);
	self.clock = new Clock(config.countdown, self);

	self.canvas = config.canvas;
	self.ctx = self.canvas.getContext('2d');
	self.width = self.canvas.width;

	if(self.isIntro){
		self.height = self.canvas.height;
	}else{
		self.height = self.canvas.height - 80;
	}

	self.pathCanvas = document.createElement("canvas");
	self.pathCanvas.width = self.width;
	self.pathCanvas.height = self.height;
	self.pathContext = self.pathCanvas.getContext('2d');
	self.DRAW_PATH = false;

	self.keyCollected = false;
	self.update = function(){
		
		self.player.update();
		self.key.update();

		var output = self.door.update();
		if(self.isIntro){
			STAGE = 1;
		}else{
			if(output=="END_LEVEL"){
				self.ctx.clearRect(0,self.height,self.canvas.width,80);
			}else{
				self.clock.update();
			}
			self.recordFrame();
		}

	};

	self.drawPathLastPoint = null;
	self.draw = function(){

		var ctx = self.ctx;

		// BIGGER EVERYTHING
		if(self.isIntro){
			ctx.save();
			var introScale = 1.5;
			ctx.scale(introScale,introScale);
			ctx.translate(-self.width/2,-self.height/2);
			ctx.translate((self.width/2)/introScale,(self.height/2)/introScale);
		}

		// Clear
		if(self.isIntro){
			ctx.clearRect(self.player.x-100,self.player.y-100,200,200);
			ctx.clearRect(self.key.x-100,self.key.y-100,200,200);
			ctx.clearRect(self.door.x-100,self.door.y-100,200,200);
		}else{
			ctx.fillStyle = "#fff";
			ctx.fillRect(0,0,self.width,self.height);
		}

		// Draw shadows
		var objects = [self.player,self.key,self.door];
		for(var i=0;i<objects.length;i++){
			objects[i].drawShadow(ctx);
		}

		// Draw circles
		ctx.fillStyle = '#333';
		for(var i=0;i<self.circles.length;i++){
			var c = self.circles[i];
			if(c.invisible) continue;
			ctx.beginPath();
			ctx.arc(c.x, c.y, c.radius, 0, Math.TAU, false);
			ctx.fill();
		}

		//画矩形
		ctx.fillStyle = '#333';
		for(var i=0;i<self.rect.length;i++){
			var c = self.rect[i];
			if(c.invisible) continue;
			ctx.beginPath();
			ctx.rect(c.x, c.y, c.w, c.h);
			//ctx.arc(c.x, c.y, c.radius, 0, Math.TAU, false);
			ctx.fill();
		}


		//画三角形
		ctx.fillStyle = '#333';
		for(var i=0;i<self.Triangle.length;i++){
			var c = self.Triangle[i];
			if(c.invisible) continue;
			ctx.beginPath();
			ctx.moveTo(c.x1,c.y1);
			ctx.lineTo(c.x2,c.y2);
			ctx.lineTo(c.x3,c.y3);
			//ctx.rect(c.x, c.y, c.w, c.h);
			//ctx.arc(c.x, c.y, c.radius, 0, Math.TAU, false);
			ctx.fill();
		}
		// // Draw ellipse
		// ctx.fillStyle = '#333';
		// for(var i=0;i<self.ellipse.length;i++){
		// 	var c = self.ellipse[i];
		// 	if(c.invisible) continue;
		// 	ctx.beginPath();
		// 	ctx.arc(c.x, c.y, c.radius, 0, Math.TAU, false);
		// 	ctx.fill();
		// }

		// Draw Peep, Key, Door in depth
		objects.sort(function(a,b){ return a.y - b.y; });
		for(var i=0;i<objects.length;i++){
			objects[i].draw(ctx);
		}

		// Draw path?
		if(self.DRAW_PATH){
			ctx.drawImage(self.pathCanvas,0,0);
			if(!self.drawPathLastPoint){
				self.drawPathLastPoint = {
					x: self.player.x-0.1,
					y: self.player.y
				};
			}

			var pctx = self.pathContext;
			pctx.beginPath();
			pctx.strokeStyle = "#cc2727";
			pctx.lineWidth = 10;
			pctx.lineCap = "round";
			pctx.lineJoin = "round";
			pctx.moveTo(self.drawPathLastPoint.x, self.drawPathLastPoint.y);
			pctx.lineTo(self.player.x, self.player.y);
			pctx.stroke();
	
			self.drawPathLastPoint = {
				x: self.player.x,
				y: self.player.y
			};

		}

		// CLOCK
		if(self.isIntro){
		}else{
			ctx.clearRect(0,self.height,self.canvas.width,80);
			if(!self.NO_CLOCK) self.clock.draw(ctx);
		}

		// BIGGER EVERYTHING
		if(self.isIntro){
			ctx.restore();
		}

	};

	self.frames = [];
	self.recordFrame = function(){
		
		var frame = {
			player:{
				x: self.player.x,
				y: self.player.y,
				sway: self.player.sway,
				bounce: self.player.bounce,
				frame: self.player.frame,
				direction: self.player.direction
			},
			key:{
				hover: self.key.hover
			},
			door:{
				frame: self.door.frame
			},
			keyCollected: self.keyCollected
		};

		self.frames.push(frame);

	}

	var lastCollected = false;
	self.playbackFrame = function(frameIndex){

		var frame = self.frames[frameIndex];

		self.player.x = frame.player.x;
		self.player.y = frame.player.y;
		self.player.sway = frame.player.sway;
		self.player.bounce = frame.player.bounce;
		self.player.frame = frame.player.frame;
		self.player.direction = frame.player.direction;

		self.key.hover = frame.key.hover;
		self.door.frame = frame.door.frame;

		self.keyCollected = frame.keyCollected;
		if(self.keyCollected && !lastCollected && STAGE==3){
			createjs.Sound.play("unlock");
		}
		lastCollected = self.keyCollected;

		self.NO_CLOCK = true;
		self.draw();

	}

	self.clear = function(){
		var ctx = self.ctx;
		ctx.clearRect(0,0,self.canvas.width,self.canvas.height);
	}

	self.onlyPath = function(){
		self.clear();
		self.ctx.drawImage(self.pathCanvas,0,0);
	}

}

//////////////

function Clock(countdown,level){
	var self = this;
	self.level = level;
	//调节时钟转动的时间，分子越小越慢
	self.framePerTick = 10/countdown;

	var enterSide = null;
	var exitSide = null;

	self.update = function(){

		// THIS IS TOTALLY A HACK, JUST FOR LEVEL 2
		// SUBTLY CHEAT - IT'S IMPOSSIBLE TO SOLVE IT THE WRONG WAY

		if(CURRENT_LEVEL==1){
			if(level.keyCollected){
				if(!exitSide && Math.abs(level.player.x-150)>30){
					exitSide = (level.player.x<150) ? "left" : "right";
				}
			}else{
				if(!enterSide && level.player.y<150){
					enterSide = (level.player.x<150) ? "left" : "right";
				}
			}
			if(exitSide && enterSide){
				if(exitSide == enterSide){
					self.frame += self.framePerTick*1.8;
				}
			}
		}

		// Normal update

		self.frame += self.framePerTick;
		if(self.frame>=30){
			createjs.Sound.play("error");
			reset();
		}

	};

	self.frame = 0;
	self.draw = function(ctx){

		ctx.save();
		ctx.translate(level.width/2,level.height+40);

		var f = Math.floor(self.frame);
		var sw = 82;
		var sh = 82;
		var sx = (f*sw) % images.clock.width;
		var sy = sh*Math.floor((f*sw)/images.clock.width);
		ctx.drawImage(images.clock, sx,sy,sw,sh, -30,-30,60,60);
		ctx.restore();

	};

}

function DoorKey(config,level){

	var self = this;
	self.level = level;

	self.x = config.x;
	self.y = config.y;

	self.hover = 0;
	self.update = function(){

		if(level.keyCollected) return;

		self.hover += 0.07;

		var dx = self.x-level.player.x;
		var dy = self.y-level.player.y;
		var distance = Math.sqrt(dx*dx/4 + dy*dy);
		if(distance<5){
			level.keyCollected = true;

			createjs.Sound.play("unlock");

		}

	};

	self.draw = function(ctx){

		if(level.keyCollected) return;

		ctx.save();
		ctx.translate(self.x, self.y-20-Math.sin(self.hover)*5);
		ctx.scale(0.7,0.7);
		ctx.drawImage(images.key,-23,-14,47,28);
		ctx.restore();

	};
	self.drawShadow = function(ctx){

		if(level.keyCollected) return;

		ctx.save();
		ctx.translate(self.x,self.y);
		ctx.scale(0.7,0.7);

		var scale = 1-Math.sin(self.hover)*0.5;
		ctx.scale(1*scale,0.3*scale);
		ctx.beginPath();
		ctx.arc(0, 0, 15, 0, Math.TAU, false);
		ctx.fillStyle = 'rgba(100,100,100,0.4)';
		ctx.fill();
		ctx.restore();

	};

}

function Door(config,level){

	var self = this;
	self.level = level;

	self.x = config.x;
	self.y = config.y;

	self.update = function(){

		if(level.keyCollected && self.frame<10){
			self.frame += 0.5;
		}

		if(level.keyCollected){
			var dx = self.x-level.player.x;
			var dy = self.y-level.player.y;
			var distance = Math.sqrt(dx*dx/25 + dy*dy);
			if(distance<6){
				if(level.isIntro){
					
					document.getElementById("whole_container").style.top = "-100%";

					createjs.Sound.play("ding");

					CURRENT_LEVEL = 0;
					var lvl = new Level(LEVEL_CONFIG[CURRENT_LEVEL]);
					levelObjects[CURRENT_LEVEL] = lvl;
					window.level = null;
					setTimeout(function(){
						window.level = lvl;
					},1200);

					return "END_LEVEL";
				}else{
					next();
					return "END_LEVEL";
				}
			}
		}

	};

	self.frame = 0;
	self.draw = function(ctx){

		ctx.save();
		ctx.translate(self.x,self.y);
		ctx.scale(0.7,0.7);

		var f = Math.floor(self.frame);
		var sw = 68;
		var sh = 96;
		var sx = (f*sw) % images.door.width;
		var sy = sh*Math.floor((f*sw)/images.door.width);
		var dx = -34;
		var dy = -91;
		ctx.drawImage(images.door, sx,sy,sw,sh, dx,dy,sw,sh);
		ctx.restore();

	};
	self.drawShadow = function(ctx){

		ctx.save();
		ctx.translate(self.x,self.y);
		ctx.scale(0.7,0.7);
		ctx.scale(1,0.2);
		ctx.beginPath();
		ctx.arc(0, 0, 30, 0, Math.TAU, false);
		ctx.fillStyle = 'rgba(100,100,100,0.4)';
		ctx.fill();
		ctx.restore();

	};

}

//////////////

function Peep(config,level){

	var self = this;
	self.level = level;

	self.x = config.x;
	self.y = config.y;
	self.vel = {x:0,y:0};
	self.frame = 0;
	self.direction = 1;

	self.update = function(){

		// Keyboard

		var dx = 0;
		var dy = 0;

		if(Key.left) dx-=1;
		if(Key.right) dx+=1;
		if(Key.up) dy-=1;
		if(Key.down) dy+=1;

		var dd = Math.sqrt(dx*dx+dy*dy);
		if(dd>0){
			self.vel.x += (dx/dd) * 2;
			self.vel.y += (dy/dd) * 2;
		}

		if(Key.left) self.direction=-1;
		if(Key.right) self.direction=1;

		if(Key.left || Key.right || Key.up || Key.down){
			//if(self.frame==0) bounce=0.8;
			self.frame++;
			if(self.frame>9) self.frame=1;
		}else{
			if(self.frame>0) self.bounce=0.8;
			self.frame = 0;
		}

		// Velocity

		self.x += self.vel.x;
		self.y += self.vel.y;
		self.vel.x *= 0.7;
		self.vel.y *= 0.7;

		// Dealing with colliding into border
		if(self.x<0) self.x=0;
		if(self.y<0) self.y=0;
		if(self.x>level.width) self.x=level.width;
		if(self.y>level.height) self.y=level.height;

		// Dealing with collision of circles
		// Hit a circle? Figure out how deep, then add that vector away from the circle.

		for(var i=0;i<level.circles.length;i++){

			var circle = level.circles[i];

			// Hit circle?
			var dx = self.x-circle.x;
			var dy = self.y-circle.y;
			var distance = Math.sqrt(dx*dx + dy*dy);
			var overlap = (circle.radius+5) - distance;
			if(overlap>0){
				
				// Yes, I've been hit, by "overlap" pixels.
				// Push me back
				var ux = dx/distance;
				var uy = dy/distance;
				var pushX = ux*overlap;
				var pushY = uy*overlap;
				self.x += pushX;
				self.y += pushY;

			}

		}


		//矩形碰撞
		// for(var i=0;i<level.rect.length;i++){
		// 	var rect = level.rect[i];
		// 	//先判断是否在矩形的x范围和y的范围之内，如果不在就不判断
		// 	// 1.如果self在y的范围之内，就判断x是否碰到
		// 	if(self.y>rect.y && self.y<(rect.y + rect.h)){
		// 		//在矩形右侧时
		// 		if(self.x>rect.x){
		// 			var Rightx = self.x - (rect.x + rect.w);
		// 			if(Rightx < 0){
		// 				self.x -= Rightx;
		// 			}

		// 		}
		// 		if(self.x<rect.x){
		// 			//在矩形左侧时
		// 			var Leftx = self.x - rect.x ;
		// 			if(Leftx <= 0 && Leftx > -5){
		// 				self.x += Leftx;
		// 			}else if(Leftx > 0 && Leftx <= rect.w){
		// 				self.x -= Leftx
		// 			}
		// 		}
		// 	}
		// 	// 2.如果self在x的范围之内，就判断y是否碰到
		// 	if(self.x>rect.x && self.x<rect.x + rect.w){
		// 		//在矩形下侧时
		// 		if(self.y>rect.y){
		// 			var dy = self.y - (rect.y + rect.h);
		// 			if(dy < 0){
		// 				self.y -= dy;
		// 			}

		// 		}
		// 		else if(self.y<rect.y){
		// 			//在矩形上侧时
		// 			var dy = self.y - rect.y;
		// 			if(dy > 0){
		// 				self.y -= dy;
		// 			}
		// 		}
		// 	}
		// }

		//矩形碰撞
		for(var i=0;i<level.rect.length;i++){
			var rect = level.rect[i];
			var rectx1 = rect.x;
			var rectx2 = rect.x + rect.w;
			var recty1 = rect.y;
			var recty2 = rect.y + rect.h;
			if((self.x>rectx1 && self.x < rectx2) && (self.y > recty1 && self.y < recty2)){
				if(self.y > recty1 && self.y < recty2){
					if(self.x>(rect.x+rect.w/2)){
						//右侧
						self.x +=(rectx2 - self.x);
					}else{
						//左侧
						self.x -=(self.x - rectx1);
					}
					
				}
				if(self.x>rectx1 && self.x < rectx2){
					if(self.y>(rect.y+rect.h/2)){
						//下侧
						self.y +=(recty2 - self.y);
					}else{
						//上侧
						self.y -=(self.y - recty1);
					}
					self.y +=rect.h;
				}
			}
			
			//如果小人吃到钥匙，则打开暗门
			if(self.level.canvas.id == 'canvas_2' && (self.x -self.level.key.x)<=1 && (self.y - self.level.key.y)<=1){
				self.level.rect = [
					{x: 175, y: 75, w:15, h:100},
					{x: 175, y: 250, w:15, h:100}
				]
			}
		}
		//三角形碰撞
		for(var i=0;i<level.Triangle.length;i++){
			var Triangle = level.Triangle[i];

			//两条边直角边和一条斜边
			//x1,x3
			var k3 = (Triangle.y3 - Triangle.y1)/(Triangle.x3 - Triangle.x1)
			var b3 = Triangle.y1 - Triangle.x1 * k3

			if((k3*self.x + b3 - self.y)<0 && self.x<Triangle.x2 && self.y < Triangle.y2){
				var d3 = (Math.abs(self.x * k3 + b3 - self.y))/(Math.sqrt(k3*k3 + 1));
				var d2 = self.x - Triangle.x2;
				var d1 = self.y - Triangle.y2;
				if(Math.abs(d3)<Math.abs(d2) && Math.abs(d3)<Math.abs(d1)){
					self.x -= d3;
					self.y -= d3;
				}
				if(Math.abs(d2)<Math.abs(d1) && Math.abs(d2)<Math.abs(d3)){
					self.x += Math.abs(d2);
				}
				if(Math.abs(d1)<Math.abs(d2) && Math.abs(d1)<Math.abs(d3)){
					self.y += Math.abs(d1);
				}
			}

			// //计算三个边的斜率，带入人的坐标，然后计算差，在进行推回
			// //x1,x2
			// var k1 = (Triangle.y2 - Triangle.y1)/(Triangle.x2 - Triangle.x1)
			// var b1 = Triangle.y1 - Triangle.x1 * k1

			// //x2,x3
			// var k2 = (Triangle.y3 - Triangle.y2)/(Triangle.x3 - Triangle.x2)
			// var b2 = Triangle.y2 - Triangle.x2 * k2

			// //x1,x3
			// var k3 = (Triangle.y3 - Triangle.y1)/(Triangle.x3 - Triangle.x1)
			// var b3 = Triangle.y1 - Triangle.x1 * k3

			// //求出点到各个直线的距离，在把点限制到三角形中就可以减了
			// var d1 = (Math.abs(self.x * k1 + b1 - self.y))/(Math.sqrt(k1*k1 + 1));
			// var d2 = (Math.abs(self.x * k2 + b2 - self.y))/(Math.sqrt(k2*k2 + 1));
			// var d3 = (Math.abs(self.x * k3 + b3 - self.y))/(Math.sqrt(k3*k3 + 1));
		}

		// Bouncy & Sway
		self.sway += swayVel;
		swayVel += ((-self.vel.x*0.08)-self.sway)*0.2;
		swayVel *= 0.9;
		self.bounce += bounceVel;
		bounceVel += (1-self.bounce)*0.2;
		bounceVel *= 0.9;

	};

	self.bounce = 1;
	var bounceVel = 0;
	self.sway = 0;
	var swayVel = 0;
	var bouncy = [0.00, 0.25, 1.00, 0.90, 0.00, 0.00, 0.25, 1.00, 0.90, 0.00];
	self.draw = function(ctx){
		
		var x = self.x;
		var y = self.y;

		// DRAW GOOFY BOUNCY DUDE //
		
		y += -6*bouncy[self.frame];

		if(self.frame==4 || self.frame==9){
			createjs.Sound.play("step",{volume:0.5});
		}

		ctx.save();
		ctx.translate(x,y);
		ctx.scale(0.5,0.5);

		ctx.rotate(self.sway);
		ctx.scale(self.direction,1);///anim.stretch, anim.stretch);
		ctx.scale(1/self.bounce, self.bounce);
		//ctx.rotate(anim.rotate*0.15);
		ctx.drawImage(images.peep,-25,-100,50,100);
		ctx.restore();

	};

	self.drawShadow = function(ctx){

		var x = self.x;
		var y = self.y;

		ctx.save();
		ctx.translate(x,y);
		ctx.scale(0.5,0.5);

		var scale = (3-bouncy[self.frame])/3;
		ctx.scale(1*scale,0.3*scale);
		ctx.beginPath();
		ctx.arc(0, 0, 20, 0, Math.TAU, false);
		ctx.fillStyle = 'rgba(100,100,100,0.4)';
		ctx.fill();
		ctx.restore();

	};

}

//// UPDATE & RENDER ////

window.requestAnimFrame = window.requestAnimationFrame ||
	window.webkitRequestAnimationFrame ||
	window.mozRequestAnimationFrame ||
	function(callback){ window.setTimeout(callback, 1000/60); };

window.onload = function(){

	addAsset("peep","assets/peep.png");
	addAsset("key","assets/key.png");
	addAsset("door","assets/door.png");
	addAsset("clock","assets/clock.png");

	createjs.Sound.alternateExtensions = ["ogg"];
	addSound("ding","audio/ding.mp3");
	addSound("rewind","audio/rewind.mp3");
	addSound("jazz","audio/jazz.mp3");
	addSound("step","audio/step.mp3");
	addSound("unlock","audio/unlock.mp3");
	addSound("error","audio/error.mp3");

	onLoadAssets(function(){

		window.setTimeout(function(){
			document.getElementById("loading").style.display = "none";
		},300);

		window.level = new Level(window.INTRO_LEVEL,true);

		//////////

		var frameDirty = false;
		function update(){

			if(STAGE==0 || STAGE==1){
				if(level){
					level.update();
					frameDirty = true;
				}
			}else if(STAGE==2||STAGE==3){
				frameDirty = true;
			}

			if(STAGE==3 && !window.HAS_PLAYED_JAZZ){

				if(STAGE==3 && CURRENT_LEVEL==1){
					var framesLeft = (rewindLevel.frames.length-rewindFrame) + levelObjects[2].frames.length;
					if(framesLeft<135){
						window.HAS_PLAYED_JAZZ = true;
						createjs.Sound.play("jazz");
					}
				}

			}

		}
		function render(){

			if(STAGE==0 || STAGE==1){

				if(level){
					level.draw();
				}

				frameDirty = false;

			}else if(STAGE==2){

				rewindLevel.playbackFrame(rewindFrame);
				rewindFrame--;
				if(rewindFrame<0){
					CURRENT_LEVEL--;
					if(CURRENT_LEVEL>=0){
						startRewind();
					}else{
						STAGE = 3;
						CURRENT_LEVEL = 0;
						startPlayback();

						document.getElementById("rewind_text").style.display = 'none';
						document.getElementById("replay_text").style.display = "block";

					}
				}

			}else if(STAGE==3){

				rewindLevel.playbackFrame(rewindFrame);
				rewindFrame++;
				if(rewindFrame>=rewindLevel.frames.length){
					CURRENT_LEVEL++;
					if(CURRENT_LEVEL<4){
						startPlayback();
					}else{

						document.getElementById("replay_text").style.display = "none";
						iHeartYou();
						STAGE = 4;

					}
				}

				frameDirty = false;

			}

		}

		setInterval(update,1000/30);
		(function animloop(){
			requestAnimFrame(animloop);
			if(frameDirty) render();
		})();

	});

};

var STAGE = 0;
// 0 - Intro
// 1 - Play levels in order
// 2 - Rewind levels
// 3 - Replay levels with path
// 4 - I HEART YOU
// 5 - End screen

function next(){
	CURRENT_LEVEL++;
	if(CURRENT_LEVEL<LEVEL_CONFIG.length){

		createjs.Sound.play("ding");

		var lvl = new Level(LEVEL_CONFIG[CURRENT_LEVEL]);
		levelObjects[CURRENT_LEVEL] = lvl;
		window.level = null;
		setTimeout(function(){
			window.level = lvl;
		},500);

	}else{
		level = null;
		STAGE = 2;
		CURRENT_LEVEL = levelObjects.length-1;
		startRewind();
		var totalFrames = null;
		for(var i = 0; i<levelObjects.length; i++){
			totalFrames += levelObjects[i].frames.length
		}
		//var totalFrames = levelObjects[0].frames.length + levelObjects[1].frames.length + levelObjects[2].frames.length;
		var totalRewindTime = totalFrames/60;
		var extraTime = 6600 - totalRewindTime*1000;
		if(extraTime<0){
			createjs.Sound.play("rewind");
		}else{
			createjs.Sound.play("rewind","none",0,extraTime);
		}

		document.getElementById("rewind_text").style.display = 'block';

	}
}

function iHeartYou(){
	
	for(var i=0; i<levelObjects.length; i++) {
		levelObjects[i].onlyPath();
	}

	document.getElementById("canvas_container").style.backgroundPosition = "0px -390px";
	document.getElementById("screen_two").style.background = "#000";
	
	var can_cont_text = document.getElementById("canvas_container_text");

	var vtext = document.getElementById("valentines_text");
	vtext.style.display = "block";
	if(window.location.hash){
		vtext.textContent = encryptString(decodeURIComponent(window.location.hash).substring(1));
	}else{
		vtext.textContent = "Happy Birthday To You!";
	}

	setTimeout(function(){
		vtext.style.letterSpacing = "3px";
	},10);
}

var rewindFrame = 0;
var rewindLevel = null;
function startRewind(){
	rewindLevel = levelObjects[CURRENT_LEVEL];
	rewindFrame = rewindLevel.frames.length-1;
}
function startPlayback(){
	rewindLevel = levelObjects[CURRENT_LEVEL];
	rewindLevel.DRAW_PATH = true;
	rewindFrame = 0;
}

var levelObjects = [];
var CURRENT_LEVEL = 0;
//时间到重置覆盖重新开始
function reset(){
	var lvl = new Level(LEVEL_CONFIG[CURRENT_LEVEL]);
	levelObjects[CURRENT_LEVEL] = lvl;
	if(window.level) window.level.clear();
	window.level = null;
	setTimeout(function(){
		window.level = lvl;
	},500);
}

///////////////////////////////////////////////////////////////////

// Simple XOR encryption (key = 1)
// The only purpose is to obscure it in the hash

function encryptString(string){
	var result = "";
	for(var i=0;i<string.length;i++){
		result += String.fromCharCode(string.charCodeAt(i)^1);
	}
	return result;
}
function decryptString(string){
	return encryptString(string); // it's XOR, duh
}

///////////////////////////////////////////////////////////////////


var introCanvas = document.getElementById("canvas_intro");
introCanvas.width = window.innerWidth;
introCanvas.height = window.innerHeight;
var cx = window.innerWidth/2;
var cy = window.innerHeight/2;

window.INTRO_LEVEL = {

	canvas:document.getElementById("canvas_intro"),
	player:{ x:cx-150, y:cy-30 },
	door:{ x:cx+150, y:cy-30 },
	key:{ x:cx, y:cy+125 },
	circles: [
		{x:cx,y:cy,radius:120,invisible:true}
	],
	rect:[],
	Triangle:[]

};

window.LEVEL_CONFIG = [

	// I
	{
		canvas:document.getElementById("canvas_1"),
		player:{ x:150, y:175 },
		door:{ x:150, y:75 },
		key:{ x:150, y:275 },
		circles: [
			{x:0,y:150,radius:100},
			{x:300,y:150,radius:100}
		],
		rect:[],
	 	Triangle:[],
		countdown:90
	},

	// HEART
	{
		canvas:document.getElementById("canvas_2"),
		player:{ x:150, y:250 },
		door:{ x:150, y:249 },
		key:{ x:150, y:75 },
		circles: [
			{x:100,y:100,radius:50},
			{x:200,y:100,radius:50},
			{x:150,y:100,radius:10,invisible:true},
			{x:0,y:300,radius:145},
			{x:300,y:300,radius:145}
		],
		rect:[],
	 	Triangle:[],
		// SUPER HACK - for level 2, change timer so it's impossible to beat if you go BACKWARDS.
		countdown: 200
	},

	// U
	{
		canvas:document.getElementById("canvas_3"),
		player:{ x:30, y:75 },
		door:{ x:270, y:75 },
		key:{ x:150, y:270 },
		circles: [
			{x:150,y:150,radius:115}
		],
		rect:[],
	 	Triangle:[],
		countdown: 130
	},
	//2
	// {
	// 	canvas:document.getElementById("canvas_1"),
	// 	player:{ x:50, y:50 },
	// 	door:{ x:275, y:280 },
	// 	key:{ x:25, y:275 },
	// 	circles: [
	// 		{x:0,y:150,radius:100},
	// 		{x:125,y:70,radius:50},
	// 		{x:300,y:100,radius:115},
	// 		{x:200,y:225,radius:50}
	// 	],
	// 	rect:[],
	// 	Triangle:[],
	// 	countdown:90
	// },

	// // 4
	// {
	// 	canvas:document.getElementById("canvas_2"),
	// 	player:{ x:200, y:300 },
	// 	door:{ x:275, y:225 },
	// 	key:{ x:150, y:200 },
	// 	circles: [
	// 		{x:0,y:300,radius:120},//左下
	// 		{x:0,y:0,radius:120},//左上
	// 		{x:300,y:75,radius:75},//右上
	// 		{x:300,y:300,radius:50}//右下
	// 		//{x:150,y:150,radius:75}//中间
	// 	],
	// 	rect:[
	// 		{x: 175, y: 75, w:15, h:300}
	// 	],
	// 	Triangle:[
	// 		{x1: 175, y1: 75, x2: 175, y2: 175, x3:85 , y3: 175}//要与上面的矩形重合
	// 	],
	// 	countdown: 130
	// },
	//蛋糕
	// {
	// 	canvas:document.getElementById("canvas_3"),
	// 	player:{ x:20, y:300 },
	// 	door:{ x:280, y:300 },
	// 	key:{ x:150, y:75 },
	// 	circles: [
	// 		// {x:0,y:300,radius:120},//左下
	// 		// {x:0,y:0,radius:120},//左上
	// 		// {x:300,y:75,radius:75},//右上
	// 		// {x:300,y:300,radius:50}//右下
	// 		//{x:150,y:150,radius:75}//中间
	// 	],
	// 	rect:[
	// 		{x: 145, y: 20, w:10, h:20},
	// 		{x: 130, y: 100, w:40, h:70},
	// 		{x: 90, y: 170, w:120, h:50},
	// 		{x: 70, y: 220, w:160, h:60},
	// 		{x: 40, y: 280, w:230, h:70}
	// 	],
	// 	Triangle:[
	// 	],
	// 	countdown: 130
	// },
	// HEART
	// {
	// 	canvas:document.getElementById("canvas_4"),
	// 	player:{ x:150, y:250 },
	// 	door:{ x:150, y:249 },
	// 	key:{ x:150, y:75 },
	// 	circles: [
	// 		{x:100,y:100,radius:50},
	// 		{x:200,y:100,radius:50},
	// 		{x:150,y:100,radius:10,invisible:true},
	// 		{x:0,y:300,radius:145},
	// 		{x:300,y:300,radius:145}
	// 	],
	// 	rect:[
			
	// 	],
	// 	Triangle:[],
	// 	// SUPER HACK - for level 2, change timer so it's impossible to beat if you go BACKWARDS.
	// 	countdown: 200
	// }
	
];

