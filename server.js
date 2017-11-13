var cfg = require('./config.json');
cfg.server.port = process.env.PORT || cfg.server.port;
var io = require('socket.io')(cfg.server.port);
var sio = require('../../lib/socket.io');

/**
 * Module dependencies.
 */

var express = require('express')
/**
 * App.
 */
var app = express.createServer();

/**
 * App listen.
 */

app.listen(cfg.server.port, function () {
  var addr = app.address();
  console.log('   app listening on http://' + addr.address + ':' + addr.port);
});

var io = sio.listen(app);


/* custom log */
	var originalFunc = console.log;
    log = function(){
      originalFunc.apply(console, [ new Date() + " - SERVER"].concat([].slice.call(arguments)))
    }
/* array splice fo good */
var spliceOne = function(arr, index) {
			// var len=arr.length;
			// if (!len) { return }
			// while (index<len) {
			//       arr[index] = arr[index+1]; index++ }
			// arr.length--;
			var res = [];
			for(var a in arr) {
				if(a != index && a != null) {
					res[a] = arr[a];
				}
			}
			return res;
    };

var indexOf = function(arr, item) {
        for (var i in arr) {
             if (i !== null && arr[i] === item) { return i }
         }
         return -1;
    };

var client_list = [];
var mobi_cnt = [];
var mobi_cnt_int = 0;
//var mobi_cnt_len = function() { var len=0; for(var m in mobi_cnt) { if(m != null) len++; } return len; };
var mobi_cnt_len = function() { return mobi_cnt_int };
var client_visual = null;
var client_mxr = null;
var globals = [];
var _curScene = "intro";

io.sockets.on('connection', function(socket) {

	log('a new connection from  ' + socket.id );
			//  client device is locked / ulocked by the user
			socket.on('hidden', function(msg) {
				log('\t\t\t--> client visibility is hidden? %s ', msg.hidden, mobi_cnt_len());
			})

			socket.on('disconnect', function() {
				log('\t\t\t--> client disconnected ', mobi_cnt_len(), socket.id);
				if(socket.id != client_visual && socket.id != client_mxr) {
					//mobi_cnt = spliceOne( mobi_cnt, socket.id );
					// var index = mobi_cnt.indexOf(socket.id);
					// if (index > -1) {
					//     mobi_cnt.splice(index, 1);
					// }
					mobi_cnt_int -= 1;
					if(mobi_cnt_int < 0) mobi_cnt_int = 0;
					var len = mobi_cnt_len();

					io.to(client_visual).emit('mobi_count', {'clients': len  });
					io.to(client_mxr).emit('mobi_count', {'clients': len });
				}
			})

	/* GLOBALS */

			socket.on('getGlobals', function() {
				io.broadcast.emit('globals_update', {'globals': globals});
			})

			socket.on('setGlobals', function(msg) {
				globals = msg;
				io.broadcast.emit('globals_update', {'globals': globals});
			})

	/* EOF - GLOBALS */


	/* HANDSHAKING */
			socket.on('ack', function(msg) {
				log("\t+-- ACK");
				io.to(socket.id).emit('cur_scene', {'curscene':_curScene});
				log("\t\tsuggesting scene: ", _curScene);
				if(msg.whoami == 'cli') {
					log("\t\tA new client joined the party: ", socket.id);
					client_list[client_list.length] = socket.id;
				} else if(msg.whoami == 'mobi') {
					log("\t\tA new client joined the party: ", socket.id);
					//mobi_cnt.push(socket.id);
					mobi_cnt_int += 1;
					var len = mobi_cnt_len();
					if(!msg.mobi_id) {
						log("\t\t\t CLIENT LIST\n\n", len, "\t\t\t EOF CLIENT LIST" );
						io.to(socket.id).emit('youare', {'mobi_id': len })
					}
					//mobi_cnt+=1;
				//  socket.broadcast.emit('globals_update', {'globals': globals});
					if(client_visual) {
						log('\t\t\t--> mobi count to Visual-cli ++: ', len );
						io.to(client_visual).emit('mobi_count', {'clients': len });
					}

					if(client_mxr) {
						log('\t\t\t--> mobi count to MXR-cli ++: ', len );
						io.to(client_mxr).emit('mobi_count', {'clients': len });
					}
				} else if(msg.whoami == 'visual') {
					log("\t\tTHE Visual client joined the party: ", socket.id);
					client_visual = socket.id;
					var len = mobi_cnt_len();
					io.to(client_visual).emit('mobi_count', {'clients': len });
				} else if(msg.whoami == 'mxr') {
					log(msg);
					client_mxr = socket.id;
					var len = mobi_cnt_len();
					io.to(client_mxr).emit('mobi_count', {'clients': len });
				}
			});
	/* EOF HANDSHAKING */



	/* FROM MIXER */

			socket.on('mxr_push', function(msg){
				log('mxr_push generic ', msg);
				socket.broadcast.emit('mxr_push_to_cli', {'msg': msg});
			});

			socket.on('mxr_push_fft', function(msg){
		    	io.emit('mxr_msg', msg);
		    	socket.broadcast.emit('mxr_push_to_cli_fft', {'msg': msg});
		  	});

		  	socket.on('mxr_push_key', function(msg){
		  		log('mxr_push key ', msg);
		  		socket.broadcast.emit('mxr_push_to_cli_key', {'msg': msg});
		  	});

	/* EOF FROM MIXER */



	/* FROM CLIENT */

			socket.on('mobi_push_key', function(msg){
		    	//socket.to().emit('user connected');
		    	console.log("mobi_push_key ",msg);
		    	socket.broadcast.emit('mobi_keypush', msg);
		  	});

	/* EOF FROM CLIENT */


	/* SCENE HANDLE */

			socket.on('mxr_set_scene', function(scene) {
				console.log("scene: ", scene)
				_curScene = scene;
				socket.broadcast.emit('cur_scene', {'curscene':_curScene});
			});

	/* EOF SCENE */
})




log("Magic happening on port " + cfg.server.port);
