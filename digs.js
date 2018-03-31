
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

$(document).ready(() => {
    const pr_movies = $.getJSON( 'bechdel-movies.json' );
    const pr_firstnames = $.getJSON( 'firstNames.json' );
    const pr_lastnames = $.getJSON( 'lastNames.json' );

    $.when( pr_movies, pr_firstnames, pr_lastnames )
        .done( ( movies, firstnames, lastnames ) => {
            // clear out the html entities from the movie titles
            const p = new DOMParser();
            movies[0] = movies[0].filter( (movie) => { return +movie.year >= 1981; } );
            movies[0].forEach( (movie) => {
                if( movie.title.includes('&') ) {
                    movie.title = p.parseFromString(movie.title, "text/html").documentElement.textContent;
                }
            });

            const game = new Game();
            game.init( movies[0], firstnames[0].firstNames, lastnames[0].lastNames );
        });
});


const Player = function(x, y, game) {
    this._x = x;
    this._y = y;
    this._game = game;
};

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
    if (!(newKey in this._game.map)) {
        // either we've run out of plane, or this is the aisle
        newY += diff[1];
        newKey = newX + ',' + newY;
        if (!(newKey in this._game.map)) { return; }
    }
    
    // ...and now draw us on the new seat
    this._x = newX;
    this._y = newY;

    this._game.setDirty();
};
 
Player.prototype.draw = function() {
    const pos = this._x + ',' + this._y;
    const seat = this._game.map[pos];
    this._game.display.draw(this._x, this._y, seat.c, seat.fg, "#105810");
};

Player.prototype.getSeat = function() {
    const key = this._x + ',' + this._y;
    return this._game.map[key];
};


const Plane = function() {
    this.flightTime = 0;
};

Plane.prototype.addTime = function(ms) {
    this.flightTime += ms / 1000;
};

Plane.prototype.getFlightTime = function() {
    const totmins = Math.floor( this.flightTime / 60 );
    const hrs = Math.floor( totmins / 60 );
    const mins = '' + (totmins % 60);

    return `${hrs}:${mins.lpad('0',2)}`;
};


// enum for the state of each seat's entertainment unit
const STATE = {
    OFF: 0,
    BROWSE: 1,
    MAP: 2,
    MOVIE: 3
};

const Game = function() {
    this.display = null;
    this.player = null;
    this.plane = null;
    this.map = {};
};

Game.prototype.init = function( movies, firstnames, lastnames ) {
    const that = this;

    // store off our corpora for later
    this._movies = movies;
    this._firstnames = firstnames;
    this._lastnames = lastnames;

    // time scale should map a 10hr flight to a 30min playtime
    this.TIMESCALE = (10 * 60) / 30;

    const options = {fontFamily:'Consolas', bg:'#000', spacing:1, fontSize:22};
    this.display = new ROT.Display(options);
    document.body.appendChild(this.display.getContainer());

    this.plane = new Plane();

    this._generateMap();    
    this._createPlayer('1A');
    this.setDirty();

    addEventListener("keydown", this.player);

    requestAnimationFrame( (ts) => { that.tick(ts); } );
};

Game.prototype.setDirty = function() {
    this.display.clear();
    this._drawWholeMap();
    this.player.draw();
    this._drawSeatInfo();
    this._drawStatusBar();
};

Game.prototype.tick = function( timestamp ) {
    if( typeof(this.lasttime) === 'undefined' ) {
        this.lasttime = timestamp;
        this.unusedtime = 0;
    }

    const deltatimems = timestamp - this.lasttime;

    this.plane.addTime( deltatimems * this.TIMESCALE );

    let unusedms = deltatimems + this.unusedtime;
    const TICKTIMEMS = 120;

    while( unusedms >= TICKTIMEMS ) {
        this._changeSeatActivity();
        unusedms -= TICKTIMEMS;
    }

    this.lasttime = timestamp;
    this.unusedtime = unusedms;

    this.setDirty();
    
    requestAnimationFrame( (ts) => { this.tick(ts); } );
};

Game.prototype._createPlayer = function(seat) {
    const tile = this.seats[seat];
    this.player = new Player(tile.x, tile.y, this);
};

Game.prototype._setSeatInfo = function(seatname, state, info ) {
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

Game.prototype._changeSeatActivity = function() {
    const seat = Object.keys(this.seats).random();

    const r = ROT.RNG.getPercentage();
    if( r < 30 ) {
        this._setSeatInfo(seat, STATE.OFF);
    }
    else if( r < 40 ) {
        this._setSeatInfo(seat, STATE.BROWSE);
    }
    else if( r < 60 ) {
        this._setSeatInfo(seat, STATE.MAP);
    }
    else {
        const movie = this._movies.random();
        this._setSeatInfo(seat, STATE.MOVIE, {title:`${movie.title} (${movie.year})`});
    }
};

Game.prototype._generateMap = function() {
    const that = this;
    this.seats = {};

    const addTile = function(char,x,y) {
        const tile = {c:char, x:x, y:y, fg:'#ddd'};
        that.map[x+','+y] = tile;
    };
    const addSeat = function(letter,row,x,y) {
        const seat = row+letter;

        const firstname = that._firstnames.random();
        const lastname = that._lastnames.random();
        const flightname = lastname.toUpperCase() + firstname.toUpperCase();

        const tile = {
            c: letter,
            seat: seat,
            state: STATE.OFF,
            info: null,

            firstname: firstname,
            lastname: lastname,
            flightname: flightname,

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
        const x = 3 + (row*2);
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
    for( let i=0; i<140; i++ )
        this._changeSeatActivity();
};

Game.prototype._drawWholeMap = function() {
    Object.values(this.map).forEach( (tile) => {
        this.display.draw(tile.x, tile.y, tile.c, tile.fg, tile.bg);
    });
};

Game.prototype._drawSeatInfo = function () {
    const x = 3;
    let y = 18;

    const seat = this.player.getSeat();
    this.display.drawText( x, y, `Seat: ${seat.seat}` );
    this.display.drawText( x+11, y, `Pax: ${seat.flightname}` );
    y+=1;

    const activities = {};
    activities[STATE.OFF] = 'Standby';
    activities[STATE.BROWSE] = 'Browsing';
    activities[STATE.MAP] = 'Flightmap';
    activities[STATE.MOVIE] = 'Watching';
    let activity = `Activity: ${activities[seat.state]}`;
    if( seat.state === STATE.MOVIE ) {
        activity += `  -->>  ${seat.info.title}`;
    }

    this.display.drawText( x, y, activity );
    y+=1;
};

Game.prototype._drawStatusBar = function() {
    let status = '  ';

    status += this.plane.getFlightTime();

    status = status.rpad(' ', 80);

    // rotjs isn't great at status bars....
    let x=0;
    const y=24;
    for( let c of status ) {
        this.display.draw( x, y, c, '#fff', '#11b' );
        x+=1;
    }
};




// copy from ROT with more care over input parameter checking
Game.prototype._rndNormal = function(mean, stddev) {
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

Game.prototype._rndCol = function(col,hspread,sspread,lspread) {
    const hsl = ROT.Color.rgb2hsl(ROT.Color.fromString(col));
    const spread = [hspread,sspread,lspread];
    for(let i=0; i<3; ++i) {
        hsl[i] = this._rndNormal(hsl[i], spread[i] * 0.01);
    }
    const rgb = ROT.Color.hsl2rgb(hsl);
    return ROT.Color.toHex(rgb);
};