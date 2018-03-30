
/*

INFLIGHT
a game by Alex Mole, @TheRealMolen

A Ghost story told via an automated controller for an in-flight entertainment system

It was never mobile phones that interfered with navigational systems on a plane; it was ghosts.

Thesis #1: An aeroplane can be haunted by the ghosts people bring aboard
Thesis #2: Ghosts are weak, but can have small affects on electrical systems
Thesis #3: Multiple ghosts working together can have a bigger impact

The player is the in-flight entertainment system management software. The display is a DOS mode
version of a plane cabin layout

  14   A  B  C     D  E  F  G     H  I  J
  15   A  B  C     D  E  F  G     H  I  J
  16   A  B  C     D  E  F  G     H  I  J
  17   A  B  C     D  E  F  G     H  I  J
  18    A  B  C     D  F  G      H  I  J
  19      A  C      D  F  G       H  J

The game starts off feeling like a nice whack-a-mole of restarting screens that crash.
The ambience is one of a happy computer - gentle beeps. Perhaps highlighting a seat would
There are small or momentary graphical glitches, that slowly increase in magnitude.
At a certain time, entire blocks start blonking out, and the graphical corruption is substantial,
increasing noticably when the player highlights seats in a certain part of the plane
#jumpscares
The player is able to converse with the ghosts solely through movie selection. The ghosts
are able to smear corrupted responses in text over the player display
Errors from core systems start appearing - the ghosts are going to take the plane down
The player is able to save the day by showing the ghosts that they have been heard and
understood, even if it's just by a piece of software.

*/

'use strict';


var Game = {
    display: null,
    engine: null,
    player: null,
    map: {},
 
    init: function() {
        var options = {fontFamily:'Consolas', bg:'#000', spacing:1, fontSize:15};
        this.display = new ROT.Display(options);
        document.body.appendChild(this.display.getContainer());

        this._generateMap();

        var scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
    }
};


var Player = function(x, y) {
    this._x = x;
    this._y = y;
    this._draw();
};

Player.prototype.act = function() {
    Game.engine.lock();
    /* wait for user input; do stuff when user hits a key */
    window.addEventListener("keydown", this);
}
 
Player.prototype.handleEvent = function(e) {
    var keyMap = {};
    keyMap[38] = 0;
    keyMap[33] = 1;
    keyMap[39] = 2;
    keyMap[34] = 3;
    keyMap[40] = 4;
    keyMap[35] = 5;
    keyMap[37] = 6;
    keyMap[36] = 7;
 
    var code = e.keyCode;
 
    if (!(code in keyMap)) { return; }
 
    var diff = ROT.DIRS[8][keyMap[code]];
    var newX = this._x + diff[0];
    var newY = this._y + diff[1];
 
    var newKey = newX + "," + newY;
    if (!(newKey in Game.map)) { return; } /* cannot move in this direction */
    
    var tile = Game.map[this._x+","+this._y];
    Game.display.draw(this._x, this._y, tile.c, tile.fg, tile.bg);
    
    this._x = newX;
    this._y = newY;
    this._draw();
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
};
 
Player.prototype._draw = function() {
    var pos = this._x + ',' + this._y;
    var bg = Game.map[pos].bg;
    Game.display.draw(this._x, this._y, "@", "#b0e8b0", bg);
};
 
Game._createPlayer = function(freeCells) {
    var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    var key = freeCells.splice(index, 1)[0];
    var parts = key.split(",");
    var x = parseInt(parts[0]);
    var y = parseInt(parts[1]);
    this.player = new Player(x, y);
};

// copy from ROT with more care over input parameter checking
Game._rndNormal = function(mean, stddev) {
    if( typeof(mean) === 'undefined') mean = 0;
    if( typeof(stddev) === 'undefined') stddev = 1;

    if( stddev === 0 ) return mean;

    do {
        var u = 2*ROT.RNG.getUniform()-1;
        var v = 2*ROT.RNG.getUniform()-1;
        var r = u*u + v*v;
    } while (r > 1 || r == 0);

    var gauss = u * Math.sqrt(-2*Math.log(r)/r);
    return mean + gauss*stddev;
};

Game._rndCol = function(col,hspread,sspread,lspread) {
    var hsl = ROT.Color.rgb2hsl(ROT.Color.fromString(col));
    var spread = [hspread,sspread,lspread];
    for(var i=0; i<3; ++i) {
        hsl[i] = this._rndNormal(hsl[i], spread[i] * 0.01);
    }
    var rgb = ROT.Color.hsl2rgb(hsl);
    return ROT.Color.toHex(rgb);
};

Game._newTile = function(char,fg,bg) {
    return {c:char,fg:fg,bg:bg};
};

Game._floorBgCol = function() {
    return this._rndCol('#282828',0,0,3);
};

Game._generateMap = function() {
    var that = this;
    this.seats = {};

    var addSeat = function(seat,row,x,y) {
        var tile = that._newTile(seat, '#fff','#000');
        tile.x = x;
        tile.y = y;

        that.map[x+','+y] = tile;
        that.seats[row+seat] = tile;
    };

    for( var row=1; row<37; row+=1) {
        var x = 4 + (row*2);
        var y = 4;

        // row 10s
        if( row>=10 ) {
            this.map[x+','+y] = this._newTile(''+Math.floor(row/10), '#fff','#000');
        }
        y+=1;

        // row units
        this.map[x+','+y] = this._newTile(''+(row%10), '#fff','#000');
        y+=1;

        // UI space
        y+=2;
        
        var firstclass = (row <= 6);

        if( firstclass )
            y+=1;

        addSeat('A',row,x,y);
        y+=1;
        
        if (!firstclass) {
            addSeat('B',row,x,y);
            y+=1;
        }

        addSeat('C',row,x,y);
        y+=1;
    
        //aisle
        y+=1;
        
        addSeat('D',row,x,y);
        y+=1;
        addSeat('E',row,x,y);
        y+=1;
        addSeat('F',row,x,y);
        y+=1;
        addSeat('G',row,x,y);
        y+=1;

        //aisle
        y+=1;

        addSeat('H',row,x,y);
        y+=1;
        if( !firstclass) {
            addSeat('J',row,x,y);
            y+=1;
        }

        addSeat('K',row,x,y);
        y+=1;
    }
    
    this._drawWholeMap();

/*
    var digger = new ROT.Map.Digger();
    var freeCells = [];
 
    var digCallback = function(x, y, value) {
        if (value) { return; } // do not store walls 
 
        var key = x+","+y;
        freeCells.push(key);
        this.map[key] = this._newTile('', '#fff', this._floorBgCol());
    }
    digger.create(digCallback.bind(this));
    
    this._generateBoxes(freeCells);

    this._drawWholeMap();
    
    this._createPlayer(freeCells);*/
}

Game._generateBoxes = function(freeCells) {
    for (var i=0;i<10;i++) {
        var index = Math.floor(ROT.RNG.getUniform() * freeCells.length);
        var key = freeCells.splice(index, 1)[0];
        this.map[key] = this._newTile('H', '#e8c62a', this._floorBgCol());
    }
};

Game._drawWholeMap = function() {
    for (var key in this.map) {
        var parts = key.split(",");
        var x = parseInt(parts[0]);
        var y = parseInt(parts[1]);
        var tile = this.map[key];
        this.display.draw(x, y, tile.c, tile.fg, tile.bg);
    }
}