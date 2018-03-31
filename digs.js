
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


var Player = function(x, y) {
    this._x = x;
    this._y = y;
};

Player.prototype.act = function() {
    Game.engine.lock();
    /* wait for user input; do stuff when user hits a key */
    window.addEventListener("keydown", this);
}
 
Player.prototype.handleEvent = function(e) {
    const keyMap = {};
    keyMap[38] = 0;
    keyMap[39] = 1;
    keyMap[40] = 2;
    keyMap[37] = 3;
 
    const code = e.keyCode;
    if (!(code in keyMap)) { return; }
 
    const diff = ROT.DIRS[4][keyMap[code]];
    const newX = this._x + diff[0] * 2;
    let newY = this._y + diff[1];
 
    let newKey = newX + ',' + newY;
    if (!(newKey in Game.map)) {
        // either we've run out of plane, or this is the aisle
        newY += diff[1];
        newKey = newX + ',' + newY;
        if (!(newKey in Game.map)) { return; }
    }
    
    // ...and now draw us on the new seat
    this._x = newX;
    this._y = newY;

    Game.setDirty();

    // now return control to the engine's scheduler
    // THINKS: we almost certainly don't want this!
    window.removeEventListener("keydown", this);
    Game.engine.unlock();
};
 
Player.prototype.draw = function() {
    const pos = this._x + ',' + this._y;
    const seat = Game.map[pos];
    Game.display.draw(this._x, this._y, seat.c, seat.fg, "#105810");
};

Player.prototype.getSeat = function() {
    const key = this._x + ',' + this._y;
    return Game.map[key];
};





// enum for the state of each seat's entertainment unit
const STATE = {
    OFF: 0,
    BROWSE: 1,
    MAP: 2,
    MOVIE: 3
};

const Game = {
    display: null,
    engine: null,
    player: null,
    map: {},
 
    init: function() {
        const options = {fontFamily:'Consolas', bg:'#000', spacing:1, fontSize:17};
        this.display = new ROT.Display(options);
        document.body.appendChild(this.display.getContainer());

        this._generateMap();    
        this._createPlayer('1A');
        this.setDirty();

        const scheduler = new ROT.Scheduler.Simple();
        scheduler.add(this.player, true);
        this.engine = new ROT.Engine(scheduler);
        this.engine.start();
    },

    setDirty: function() {
        this.display.clear();
        this._drawWholeMap();
        this.player.draw();
        this._drawSeatInfo();
    }
};


Game._createPlayer = function(seat) {
    const tile = this.seats[seat];
    this.player = new Player(tile.x, tile.y);
};

Game._setSeatInfo = function(seatname, state, info ) {
    const fgcols = {};
    fgcols[STATE.OFF] = '#665';
    fgcols[STATE.BROWSE] = '#aba';
    fgcols[STATE.MAP] = '#99d';
    fgcols[STATE.MOVIE] = '#ca6';

    const seat = this.seats[seatname];

    seat.state = state;
    seat.info = info;
    seat.fg = fgcols[state];
};

Game._generateMap = function() {
    const that = this;
    this.seats = {};

    const addTile = function(char,x,y) {
        const tile = {c:char, x:x, y:y, fg:'#ddd'};
        that.map[x+','+y] = tile;
    };
    const addSeat = function(letter,row,x,y) {
        const seat = row+letter;

        const tile = {
            c: letter,
            seat: seat,
            state: STATE.OFF,
            info: null,

            fg:'#999',
            bg:'#000',
            x: x,
            y: y,
            key: x+','+y
        };

        that.map[tile.key] = tile;
        that.seats[seat] = tile;
        that._setSeatInfo(seat, STATE.OFF);
    };

    for( let row=1; row<37; row+=1) {
        const x = 4 + (row*2);
        let y = 4;

        // row 10s
        if( row>=10 )
            addTile( Math.floor(row/10), x, y);
        y+=1;
        addTile( ''+(row%10), x, y );
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
        
        y+=1; //aisle
        
        addSeat('D',row,x,y);
        y+=1;
        if( !firstclass) {
            addSeat('E',row,x,y);
            y+=1;
        }
        addSeat('F',row,x,y);
    }

    // initialise seats
    for( let i=0; i<14; i++ ) {
        const seat = Object.keys(this.seats).random();
        this._setSeatInfo(seat, STATE.MAP);
    }
    for( let i=0; i<18; i++ ) {
        const seat = Object.keys(this.seats).random();
        this._setSeatInfo(seat, STATE.BROWSE);
    }
    for( let i=0; i<38; i++ ) {
        const seat = Object.keys(this.seats).random();
        this._setSeatInfo(seat, STATE.MOVIE, {title:`One Flew Over the Cuckoo's Nest`});
    }
};

Game._drawWholeMap = function() {
    Object.values(this.map).forEach( (tile) => {
        this.display.draw(tile.x, tile.y, tile.c, tile.fg, tile.bg);
    });
};

Game._drawSeatInfo = function () {
    const x = 3;
    let y = 17;

    const seat = this.player.getSeat();
    this.display.drawText( x, y, `Seat: ${seat.seat}` );
    y+=1;

    const activities = {};
    activities[STATE.OFF] = 'Standby';
    activities[STATE.BROWSE] = 'Browsing';
    activities[STATE.MAP] = 'Flightmap';
    activities[STATE.MOVIE] = 'Watching';
    this.display.drawText( x, y, `Activity: ${activities[seat.state]}` );
    y+=1;

    if( seat.state === STATE.MOVIE ) {
        this.display.drawText( x+6, y, seat.info.title );
        y+=1;
    }
};




// copy from ROT with more care over input parameter checking
Game._rndNormal = function(mean, stddev) {
    if( typeof(mean) === 'undefined') mean = 0;
    if( typeof(stddev) === 'undefined') stddev = 1;

    if( stddev === 0 ) return mean;

    let u=0;
    let r=0;
    do {
        u = 2*ROT.RNG.getUniform()-1;
        const v = 2*ROT.RNG.getUniform()-1;
        r = u*u + v*v;
    } while (r > 1 || r == 0);

    const gauss = u * Math.sqrt(-2*Math.log(r)/r);
    return mean + gauss*stddev;
};

Game._rndCol = function(col,hspread,sspread,lspread) {
    const hsl = ROT.Color.rgb2hsl(ROT.Color.fromString(col));
    const spread = [hspread,sspread,lspread];
    for(let i=0; i<3; ++i) {
        hsl[i] = this._rndNormal(hsl[i], spread[i] * 0.01);
    }
    const rgb = ROT.Color.hsl2rgb(hsl);
    return ROT.Color.toHex(rgb);
};