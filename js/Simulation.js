THREE.GeometryUtils.randomPointsInGeometry = function ( geometry, n ) {

	var face, i,
		faces = geometry.faces,
		vertices = geometry.vertices,
		il = faces.length,
		totalArea = 0,
		cumulativeAreas = [],
		vA, vB, vC;

	// precompute face areas

	for ( i = 0; i < il; i ++ ) {

		face = faces[ i ];

		vA = vertices[ face.a ];
		vB = vertices[ face.b ];
		vC = vertices[ face.c ];

		face._area = THREE.GeometryUtils.triangleArea( vA, vB, vC );

		totalArea += face._area;

		cumulativeAreas[ i ] = totalArea;

	}

	// binary search cumulative areas array

	function binarySearchIndices( value ) {

		function binarySearch( start, end ) {

			// return closest larger index
			// if exact number is not found

			if ( end < start )
				return start;

			var mid = start + Math.floor( ( end - start ) / 2 );

			if ( cumulativeAreas[ mid ] > value ) {

				return binarySearch( start, mid - 1 );

			} else if ( cumulativeAreas[ mid ] < value ) {

				return binarySearch( mid + 1, end );

			} else {

				return mid;

			}

		}

		var result = binarySearch( 0, cumulativeAreas.length - 1 );
		return result;

	}

	// pick random face weighted by face area

	var r, index,
		result = [];

	var stats = {};

	for ( i = 0; i < n; i ++ ) {

		r = THREE.Math.random16() * totalArea;

		index = binarySearchIndices( r );

		result[ i ] = THREE.GeometryUtils.randomPointInFace( faces[ index ], geometry );

		if ( ! stats[ index ] ) {

			stats[ index ] = 1;

		} else {

			stats[ index ] += 1;

		}

	}

	return result;

}

THREE.GeometryUtils.triangleArea = function () {

	var vector1 = new THREE.Vector3();
	var vector2 = new THREE.Vector3();

	return function ( vectorA, vectorB, vectorC ) {

		vector1.subVectors( vectorB, vectorA );
		vector2.subVectors( vectorC, vectorA );
		vector1.cross( vector2 );

		return 0.5 * vector1.length();

	};

}()

THREE.GeometryUtils.randomPointInTriangle = function () {

	var vector = new THREE.Vector3();

	return function ( vectorA, vectorB, vectorC ) {

		var point = new THREE.Vector3();

		var a = THREE.Math.random16();
		var b = THREE.Math.random16();

		if ( ( a + b ) > 1 ) {

			a = 1 - a;
			b = 1 - b;

		}

		var c = 1 - a - b;

		point.copy( vectorA );
		point.multiplyScalar( a );

		vector.copy( vectorB );
		vector.multiplyScalar( b );

		point.add( vector );

		vector.copy( vectorC );
		vector.multiplyScalar( c );

		point.add( vector );

		return point;

	};

}()

THREE.GeometryUtils.randomPointInFace = function ( face, geometry ) {

	var vA, vB, vC;

	vA = geometry.vertices[ face.a ];
	vB = geometry.vertices[ face.b ];
	vC = geometry.vertices[ face.c ];

	return THREE.GeometryUtils.randomPointInTriangle( vA, vB, vC );

}


function Simulation( renderer, width, height ) {
	
	this.width = width;
	this.height = height;
	this.renderer = renderer;
	this.targetPos = 0;
			
	this.data = new Float32Array( this.width * this.height * 4 );

//	var geometry = new THREE.IcosahedronGeometry( 2, 3 );
//	var geometry = new THREE.TorusKnotGeometry( 2, .6, 100, 16 );
//	var geometry = new THREE.BoxGeometry( 1,1,1 );

//	var m = new THREE.Mesh( geometry, new THREE.MeshNormalMaterial () );
//	scene.add( m );

//	var points = THREE.GeometryUtils.randomPointsInGeometry( geometry, this.width * this.height );

	/*
	var r = 2;
	for( var i = 0, l = this.width * this.height; i < l; i ++ ) {

		this.data[ i * 4 ] = ( .5 - Math.random() ) * r;
		this.data[ i * 4 + 1 ] = ( .5 - Math.random() ) * r;
		this.data[ i * 4 + 2 ] = ( .5 - Math.random() ) * r;
		this.data[ i * 4 + 3 ] = Math.random() * 100; // frames life

	}*/

	var r = 1;
	for( var i = 0, l = this.width * this.height; i < l; i ++ ) {

		var phi = Math.random() * 2 * Math.PI;
		var costheta = Math.random() * 2 -1;
		var theta = Math.acos( costheta );
		r = .85 + .15 * Math.random();

		this.data[ i * 4 ] = r * Math.sin( theta) * Math.cos( phi );
		this.data[ i * 4 + 1 ] = r * Math.sin( theta) * Math.sin( phi );
		this.data[ i * 4 + 2 ] = r * Math.cos( theta );	
		this.data[ i * 4 + 3 ] = Math.random() * 100; // frames life

	}

/*	points.forEach( function( p, i ) {

		this.data[ i * 4 ]     = p.x;
		this.data[ i * 4 + 1 ] = p.y;
		this.data[ i * 4 + 2 ] = p.z;
		this.data[ i * 4 + 3 ] = Math.random() * 100; // frames life

	}.bind( this ) );*/

	this.texture = new THREE.DataTexture( this.data, this.width, this.height, THREE.RGBAFormat, THREE.FloatType );
	this.texture.minFilter = THREE.NearestFilter;
	this.texture.magFilter = THREE.NearestFilter;
	this.texture.needsUpdate = true;

	this.rtTexturePos = new THREE.WebGLRenderTarget(this.width, this.height, {
		wrapS: THREE.RepeatWrapping,
		wrapT: THREE.RepeatWrapping,
		minFilter: THREE.NearestFilter,
		magFilter: THREE.NearestFilter,
		format: THREE.RGBAFormat,
		type: THREE.FloatType,
		stencilBuffer: false
	});

	this.targets = [ this.rtTexturePos, this.rtTexturePos.clone() ];

	this.simulationShader = new THREE.ShaderMaterial({

		uniforms: {
			active: { type: 'f', value: 1 },
			width: { type: "f", value: this.width },
			height: { type: "f", value: this.height },
			oPositions: { type: "t", value: this.texture },
			tPositions: { type: "t", value: null },
			timer: { type: "f", value: 0 },
			delta: { type: "f", value: 0 },
			speed: { type: "f", value: .5 },
			reset: { type: 'f', value: 0 },
			offset: { type: 'v3', value: new THREE.Vector3( 0, 0, 0 ) },
			genScale: { type: 'f', value: 1 },
			factor: { type: 'f', value: .5 },
			evolution: { type: 'f', value: .5 },
			inverseModelViewMatrix: { type: 'm4', value: new THREE.Matrix4() },
			radius: { type: 'f', value: 2 }
		},

		vertexShader: document.getElementById('texture_vertex_simulation_shader').textContent,
		fragmentShader:  document.getElementById('texture_fragment_simulation_shader').textContent,
		side: THREE.DoubleSide

	});

	this.simulationShader.uniforms.tPositions.value = this.texture;

	this.rtScene = new THREE.Scene();
	this.rtCamera = new THREE.OrthographicCamera( -this.width / 2, this.width / 2, -this.height / 2, this.height / 2, -500, 1000 );
	this.rtQuad = new THREE.Mesh(
		new THREE.PlaneBufferGeometry( this.width, this.height ),
		this.simulationShader
	);
	this.rtScene.add( this.rtQuad );

	this.renderer.render( this.rtScene, this.rtCamera, this.rtTexturePos );

	this.plane = new THREE.Mesh( new THREE.PlaneGeometry( 64, 64 ), new THREE.MeshBasicMaterial( { map: this.rtTexturePos, side: THREE.DoubleSide } ) );
	//scene.add( this.plane );

}

Simulation.prototype.render = function( time, delta ) {

	//simulationShader.uniforms.impulse.value = .5;
	this.simulationShader.uniforms.timer.value = .1 * time;
	this.simulationShader.uniforms.delta.value = .16;//0. * delta;

	this.simulationShader.uniforms.tPositions.value = this.targets[ this.targetPos ];
	this.targetPos = 1 - this.targetPos;
	this.renderer.render( this.rtScene, this.rtCamera, this.targets[ this.targetPos ] );

}
