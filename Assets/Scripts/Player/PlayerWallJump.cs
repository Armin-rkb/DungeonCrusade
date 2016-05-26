using UnityEngine;
using System.Collections;

public class PlayerWallJump : MonoBehaviour {

    private Rigidbody2D _playerRigidBody2D;

    private bool _playerOnLeftWall;
    private bool _playerOnRightWall;

    bool _jumpOffLeftWall;
    bool _jumpOffRightWall;
    

	void Start ()
    {
        _playerRigidBody2D = this.GetComponent<Rigidbody2D>();
	}
	

	void FixedUpdate () 
    {


        if (_jumpOffLeftWall)
            _playerRigidBody2D.AddForce(new Vector2(15, 20), ForceMode2D.Impulse);
        else if (_jumpOffRightWall)
            _playerRigidBody2D.AddForce(new Vector2(-15, 20), ForceMode2D.Impulse);

	}

    void Update()
    {
        if (Input.GetButtonDown(ControllerInputs.jumpp + 1) || (Input.GetButtonDown(ControllerInputs.jumpp + 2)))
        {
            if (_playerOnLeftWall)
                _jumpOffLeftWall = true;
            else if (_playerOnRightWall)
                _jumpOffRightWall = true;
        }
    }

 

    void OnCollisionStay2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.wallleft)
            _playerOnLeftWall = true;

        else if (coll.gameObject.tag == GameTags.wallright)
            _playerOnRightWall = true;
    }

    void OnCollisionExit2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.wallleft)
        {
            _playerOnLeftWall = false;
            _jumpOffLeftWall = false;
        }
            

        else if (coll.gameObject.tag == GameTags.wallright)
        {
            _playerOnRightWall = false;
            _jumpOffRightWall = false;
        }
            
    }

}
