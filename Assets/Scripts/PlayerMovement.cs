using UnityEngine;
using System.Collections;

public class PlayerMovement : MonoBehaviour {


    //Float
    [SerializeField]
    private float _movementSpeed = 2f;
    private float _jumpSpeed = 10f;
    private float _gravityPlayer = 20f;
    private float _amountJumps = 0;
    //Float

    //Vector2
    private Vector2 _moveDirection;
    //Vector2

    //CharacterController
    private CharacterController _playerController;
    //CharacterController

    //Bool
    [SerializeField]
    private bool _isGrounded;
    private bool _spacePressed;
    private bool _canJump;
    //Bool

    
    //RigidBody2D
    private Rigidbody2D _playerRigidBody2D;
    //RigidBody2D
  
	void Start ()
    {
        _playerController = this.gameObject.GetComponent<CharacterController>();
        _playerRigidBody2D = this.gameObject.GetComponent<Rigidbody2D>();
	}
	
	void FixedUpdate ()
    {
        RigidBodyMove();
        Jump();
	}

    void Update ()
    {
        JumpBool();
    }

    void RigidBodyMove()
    {
        float x = Input.GetAxis("Horizontal");
        _playerRigidBody2D.velocity = new Vector2(x * _movementSpeed, _playerRigidBody2D.velocity.y);
    }

    private void JumpBool()
    {
        if (Input.GetKeyDown(KeyCode.Space))
        {
            _canJump = true;
        }
    }

    private void Jump()
    {
        if (_canJump)
        {
            if (!_spacePressed && _amountJumps < 2)
            {
                _playerRigidBody2D.velocity = new Vector2(0, _jumpSpeed);

                _spacePressed = true;
                _isGrounded = false;

                _jumpSpeed -= 2f;

                _amountJumps++;
            }
            else
            {
                _spacePressed = false;
                _canJump = false;
            }
                
        }
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.ground)
        {
            _isGrounded = true;
            _amountJumps = 0;
            _jumpSpeed = 10f;
        }
    }


}
