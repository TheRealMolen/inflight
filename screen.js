
// a lovely shakeable screen

const Screen = function( el ) {
    this._el = el;
    this._shakes = [];
    this._nextShake = 1;
    this._offs = {x:0, y:0};

    this._noise = [];
    for( let i=0; i<500; i+=1)
        this._noise.push( _rndNormal(0, 0.5) );
};

Screen.prototype.addShake = function( freq, xmag, ymag, duration, name, pow ) {
    if( typeof pow === 'undefined' ) pow = 1;

    this._shakes.push( {
        freq:freq,
        pow:pow,
        xmag:xmag, 
        ymag:ymag,
        offs:this._nextShake,
        msrunning:0, 
        mstotal:(duration*1000), 
        name:name} );

    this._nextShake = (this._nextShake + 171) % this._noise.length;
};

Screen.prototype.addBump = function() {
    this.addShake( 60, 8, 16, 0.45, 'bump' );
};

Screen.prototype.addTaxiShake = function() {
    this.addShake( 40, 2, 3, 1000, 'taxi', 1.4 );
};

Screen.prototype.addAscentJudder = function() {
    this.addShake( 60, 2, 6, 10, 'judder', 1.2 );
};

Screen.prototype.addFlightRumble = function() {
    this.addShake( 40, 2, 2, 1000, 'flight', 1.8 );
};

Screen.prototype.updateShake = function( name, duration ) {
    this._shakes.forEach( (shake) => {
        if( shake.name === name ) {
            shake.msrunning = 0;
            shake.mstotal = duration * 1000;
        }
    });
};

Screen.prototype.update = function( deltatimems ) {
    const that = this;
    const easeOut = function(t) {
        return (2*t - (t*t));
    };
    const lerp = function(a,b,t) {
        return a + t * (b-a);
    };
    const noise1d = function(t, freq, offs) {
        const n = that._noise;
        const s = t * freq;
        const s0 = (Math.floor(s) + offs) % n.length;
        const s1 = (s0 + 1) % n.length;
        return lerp( n[s0], n[s1], s - Math.floor(s) );
    };

    const offs = {x:0, y:0};
    this._shakes.forEach( (shake) => {
        shake.msrunning += deltatimems;

        if( shake.msrunning < shake.mstotal ) {
            const ease = easeOut(1 - (shake.msrunning / shake.mstotal));
            offs.x += ease * shake.xmag * Math.pow( noise1d(shake.msrunning/1000, shake.freq, shake.offs), shake.pow );
            offs.y += ease * shake.ymag * Math.pow( noise1d(shake.msrunning/1000, shake.freq, shake.offs + 137), shake.pow );
        }
    });
    this._shakes = this._shakes.filter( (s) => { return s.msrunning < s.mstotal; } );

    this._el.css( 'left', Math.floor(offs.x) );
    this._el.css( 'top', Math.floor(offs.y) );
};
