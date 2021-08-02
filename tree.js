class TreeNode
{
  constructor ( move, fen, apgn, parent, tree )
  {
    this . move        = move;
    this . fen         = fen;
    this . apgn        = apgn;
    this . parent      = parent;
    this . tree        = tree;
    
    this . children    = [];
    
    this . listElem    = null;
    this . commentElem = null;
    this . itemElem    = document . createElement ( "li" );
    this . codeElem    = document . createElement ( "code" );
    
    this . codeElem . innerText = this . move [ "san" ];
    this . itemElem . appendChild ( this . codeElem );
    
    // adding event listeners
    var that = this;
    this . codeElem . onclick = function () {
      that . tree . changeActive ( that );
    }
  }
  
  insert ( node )
  {
    if ( this . listElem == null )
    {
      this . listElem = document . createElement ( "ul" );
      this . itemElem . appendChild ( this . listElem );
    }
    
    this . children . push ( node );
    
    this . listElem . appendChild ( node . getItemElem () );
  }
  
  isLeaf ()
  {
    return this . children . length == 0;
  }
  
  isRoot ()
  {
    return this . parent == null;
  }
  
  // --------------------------------------------------------------------------
  
  highlight ()
  {
    this . codeElem . style [ "background-color" ] = "darkblue";
  }
  
  lowlight ()
  {
    this . codeElem . style [ "background-color" ] = "";
  }
  // --------------------------------------------------------------------------
  
  getItemElem ()
  {
    return this . itemElem;
  }
  
  getCodeElem ()
  {
    return this . codeElem;
  }
  
  getFen ()
  {
    return this . fen;
  }
  
  getChildren ()
  {
    return [...this . children];
  }
  
  getSan ()
  {
    return this . move [ "san" ];
  }
  
  getAlgebraic ()
  {
    if ( this . move [ "from" ] == "" )
      return [];
    
    return [ this . move [ "from" ], this . move [ "to" ] ];
    // return [... this . algebraic];
  }
}

class Tree
{
  //            !!!!!!!!!!!
  constructor ( boardElem, treeElem = null )
  {
    // this . apiEndpoint = apiEndpoint;
    this . apiEndpoint = "<redacted>";
    this . boardElem = boardElem;
    this . treeElem = treeElem;
    this . storage = {};
    
    this . chess = Chess();
    this . chessground = null;
    
    // the tree itself
    this . tree = {
      root: null,
      activeNode: null,
    }

    
    // temporary config ? //
    this . config = 
    {
      highlight: {
        lastMove: true,
        check: true
      },
      animation: {
        enabled: true
      },
    }
  };
  
  // --------------------------------------------------------------------------
  async get ( id = null )
  {
    
    let url = ( id != null ) ? this . apiEndpoint + id : this . apiEndpoint;    
    const data = await fetch ( url ) . then ( response => response . json () );
    
    return data;
  }
  // -------------------------------------------------------------------------- 
  
  async Init ( id = null )
  {
    let known = await this . get ( "known" ) . then ( (data) => {
      for ( var i = 0; i < data . length; i++ )
        this . storage [ data [i] [ "id" ] ] = data[i];
    } );
    
    if ( id )
    {
      /* get the game */
      let game = await this . get ( id ) . then ( (game) => {
        this . activeGame = this . storage [ game [ "id" ] ];
        this . activeGame [ "comments" ] = game [ "comments" ];
        this . activeGame [ "branches" ] = game [ "branches" ];
        
        this . chess = Chess ( this . storage [ id ] [ "start" ] );
        
        this . setupBoard ();
        
        // and if the tree element is present, draw tree 
        if ( this . treeElem != null )
          this . drawTree ();
      } );
    }
  }
  
  setupBoard ( )
  {
    /* sets up Chessground board based on the active game */
    let gameColor = this . activeGame [ "start" ] . split ( ' ' )[1];
    
    /* set up board if does not exist */
    if ( this . boardElem != null )
    {
      this . chessground = Chessground ( this . boardElem, this . config );
      this . chessground . set ( {
        fen: this . activeGame [ "start" ],
        turnColor: ( gameColor == "w" ) ? "white" : "black",
        movable: {
          free: false,
          dests: this . legalMoves(),
          color: ( gameColor == "w" ) ? "white" : "black",
          events: {
            after: this . drawingEngine()
          }
        },
        draggable: {
          showGhost: true
        }
      } );
      
      if ( gameColor == "b" )
        this . chessground . toggleOrientation ();
    }
  }

  
  // --------------------------------------------------------------------------
  // utility functions
  
  legalMoves ()
  {
    // (c) observablehq
    const dests = new Map ();
    this . chess . SQUARES . forEach ( s => {
      const ms = this . chess . moves ( { square: s, verbose: true } );
      if ( ms . length )
        dests . set ( s, ms . map ( m => m.to ) )
    } );
    
    return dests;
  }
  // --------------------------------------------------------------------------
  // callbacks - for drawing the tree and playing the engine
  drawingEngine ( orig, dest)
  {
    return (orig, dest ) => {
      // update the engine itself
      let move = this . chess . move ( { 
        from: orig, 
        to: dest 
      } );
      
      // update the board
      this . chessground . set ( {
        check: this . chess. in_check (),
        movable: {
          color: ( this . chess . turn () === 'w' ) ? "white" : "black",
          dests: this . legalMoves ()
        }
      } );
      
      
      this . newMove ( move );
    }
  }
  // --------------------------------------------------------------------------
  // perhaps later a separate class with own functions ?
  
  drawTree ()
  {
    // delete all children of the current tree 
    while ( this . treeElem . firstChild )
      this . treeElem . removeChild ( this . treeElem . lastChild );

    // initiate root 
    var move = {
      "san": this . activeGame [ "name" ],
      "from": "",
      "to": ""
    }
    var node = new TreeNode ( move, this . chess . fen (), "", null, this );
    
    this . tree . root = node 
    this . tree . activeNode = node;
    
    
    // create the <ul> list
    let list = document . createElement ( "ul" );
    list . classList . add ( "tree" );
    this . treeElem . appendChild ( list );

    // append the root item element to the list
    list . appendChild ( node . getItemElem () );
    
    node . highlight ();
    
    this . buildTree();
  }
  
  newMove ( move )
  {
    let children = this . tree . activeNode . getChildren ();
    
    for ( var i = 0; i < children . length; i++ )
    {
      if ( children[i] . getSan() == move [ "san" ] )
      {
        this . changeActive ( children[i] );
        return;
      }
    }
    
    // ( san, fen, apgn, parent, tree )
    let current = this . tree . activeNode;
    let apgn = current [ "apgn" ] == "" ? move [ "san" ] : current [ "apgn" ] + ' ' + move [ "san" ];
    
    let node = new TreeNode ( move, this . chess . fen (), apgn, current, this );
    
    current . insert ( node );
    
    this . changeActive ( node );
  }
  
  changeActive ( node )
  {
    // ignore if the same one
    if ( this . tree . activeNode == node )
      return;
    
    // style changes
    this . tree . activeNode . lowlight ();
    node . highlight ();
    
    this . tree . activeNode = node;
    
    // update tree properties - if the fen is different
    if ( this . chess . fen () != node . getFen() )
    {
      this . chess = Chess ( node . getFen () );
      this . chessground . set ( {
        turnColor: ( this . chess . turn () === 'w' ) ? "white" : "black",
        fen: node . getFen (),
        check: this . chess. in_check (),
        movable: {
          color: ( this . chess . turn () === 'w' ) ? "white" : "black",
          dests: this . legalMoves (),
        },
        lastMove: node . getAlgebraic ()
      } );
    }
  }
  
  resetRoot ()
  {
    this . changeActive ( this . tree . root );
  }
  
  buildTree ()
  {
    for ( var i = 0; i < this . activeGame . branches . length; i++ )
    {
      // set root as new active -- resets engine & board
      this . resetRoot ()
      
      let moves = this . activeGame . branches[i] [ "pgn" ] . split ( ' ' );
      
      for ( var j = 0; j < moves . length; j++ )
        this . newMove ( this . chess . move ( moves[j] ) );
    }
    
    // reset the board again
    this . resetRoot ();
  }
}
