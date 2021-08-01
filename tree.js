class TreeNode
{
  constructor ( san, fen, apgn, parent, tree )
  {
    this . san         = san;
    this . fen         = fen;
    this . apgn        = apgn;
    this . parent      = parent;
    this . tree        = tree;
    
    this . children    = [];
    this . childrenSan = [];
    
    
    this . listElem    = null;
    this . commentElem = null;
    this . itemElem    = document . createElement ( "li" );
    this . codeElem    = document . createElement ( "code" );
    
    this . codeElem . innerText = san;
    this . itemElem . appendChild ( this . codeElem );
    
    // adding event listeners
    var that = this;
    this . codeElem . onclick = function () {
      that . tree . changeActive ( that . codeElem );
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
    this . childrenSan . push ( node [ "san" ] );
    
    this . listElem . appendChild ( node . getItemElem () );
  }
  
  isLeaf ()
  {
    return this . children . length == 0;
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
    return this . children;
  }
  
  getChildrenSan ()
  {
    return this . childrenSan;
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
      codeMap: new Map(),
      fenMap: new Map()
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
      
      // san move: move [ "san" ]
      this . newMove ( move [ "san" ] );
    }
  }
  // --------------------------------------------------------------------------
  // perhaps later a separate class with own functions ?
  
  drawTree ()
  {
    let name = this . activeGame [ "name" ];
    
    // delete all children of the current tree 
    while ( this . treeElem . firstChild )
      this . treeElem . removeChild ( this . treeElem . lastChild );
    
    // initiate root 
    var node = new TreeNode ( name, this . chess . fen (), "", null, this );
    
    this . tree . root = node 
    this . tree . activeNode = node;
    
    this . tree . codeMap . set ( node . getCodeElem (), node );
    this . tree . fenMap . set ( node . getFen (), node );
    
    // create the <ul> list
    let list = document . createElement ( "ul" );
    list . classList . add ( "tree" );
    this . treeElem . appendChild ( list );

    // append the root item element to the list
    list . appendChild ( node . getItemElem () );
    
    node . highlight ();
  }
  
  newMove ( san )
  {
    let children = this . tree . activeNode . getChildren ();
    
    for ( var i = 0; i < children . length; i++ )
    {
      if ( children[i] . san == san )
      {
        this . changeActive ( children[i] . getCodeElem () );
        return;
      }
    }
    
    // ( san, fen, apgn, parent, tree )
    let current = this . tree . activeNode;
    let apgn = current [ "apgn" ] == "" ? san : current [ "apgn" ] + ' ' + san;
    
    let node = new TreeNode ( san, this . chess . fen (), apgn, current, this );
    this . tree . codeMap . set ( node . getCodeElem (), node );
    this . tree . fenMap . set ( node . getFen (), node );
    
    current . insert ( node );
    
    this . changeActive ( node . getCodeElem () );
  }
  
  changeActive ( codeElem )
  {
    if ( this . tree . codeMap . get ( codeElem ) == undefined )
      throw "this node does not exist in Tree.codeMap!";
    
    let node = this . tree . codeMap . get ( codeElem );
    let nodeFen = node . getFen ();
    
    // ignore if the same one
    if ( this . tree . activeNode == node )
      return;
    
    // style changes
    this . tree . activeNode . lowlight ();
    node . highlight ();
    
    this . tree . activeNode = node;
    
    // update tree properties - if the fen is different
    if ( this . chess . fen () != nodeFen
      && this . chessground . getFen () != nodeFen . split ( ' ' )[0] )
    {
      // TODO: last move highlighting
      
      this . chess = Chess ( node . getFen () );
      this . chessground . set ( {
        turnColor: ( this . chess . turn () === 'w' ) ? "white" : "black",
        fen: node . getFen (),
        check: this . chess. in_check (),
        movable: {
          color: ( this . chess . turn () === 'w' ) ? "white" : "black",
          dests: this . legalMoves (),
        }
      } );
    }
  }
}
