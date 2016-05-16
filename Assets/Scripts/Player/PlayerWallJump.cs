using UnityEngine;
using System.Collections;

public class PlayerWallJump : MonoBehaviour {

    private Rigidbody2D _playerRigidBody2D;

    private bool _playerOnLeftWall;
    private bool _playerOnRightWall;

    

	void Start ()
    {
        _playerRigidBody2D = this.GetComponent<Rigidbody2D>();
	}
	

	void FixedUpdate () 
    {
        

            if (_playerOnLeftWall)
                _playerRigidBody2D.AddForce(new Vector2(15, 20), ForceMode2D.Impulse);
            else if (_playerOnRightWall)
                _playerRigidBody2D.AddForce(new Vector2(-15, 20), ForceMode2D.Impulse);

	}

    void Update()
    {
        if (Input.GetButtonDown(ControllerInputs.jumpp + 1) || (Input.GetButtonDown(ControllerInputs.jumpp + 2)))
        {
            // Walljump?
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
            _playerOnLeftWall = false;

        else if (coll.gameObject.tag == GameTags.wallright)
            _playerOnRightWall = false;
    }

}
