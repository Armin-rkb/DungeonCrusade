using UnityEngine;
using System.Collections;

public class PlayerMovement : MonoBehaviour {


    //Float
    [SerializeField]
    private float _movementSpeed = 2f;
    private float _jumpSpeed;
    private float _amountJumps = 0;
    //Float

    //Vector2
    private Vector2 _moveDirection;
    //Vector2

    //Bool
    [SerializeField]
    private bool _isGrounded;
    private bool _spacePressed;
    private bool _canJump;
    private bool _onWall;
    private bool _isHit;
    private bool _joystickEnabled;
    //Bool

    //Int
    [SerializeField]
    private int _playerNumber;

    public int PlayerNumber
    {
    get { return _playerNumber; }
    }
    //int

    //Script
    private PlayerWeapon playerweapon;
    //Script
    
    //RigidBody2D
    private Rigidbody2D _playerRigidBody2D;
    //RigidBody2D

	void Start ()
    {
        _playerRigidBody2D = this.gameObject.GetComponent<Rigidbody2D>();
        playerweapon = this.gameObject.GetComponent<PlayerWeapon>();
	}
	
	void FixedUpdate ()
    {
        if (!_isHit)
        {
            RigidBodyMove();
            Jump();
        }
	}

    void Update ()
    {
        JumpBool();
    }

    public void ApplyKnockback(float xPos)
    {
        _isHit = true;
        _playerRigidBody2D.velocity = new Vector2(-xPos, _playerRigidBody2D.velocity.y);
        StartCoroutine(Recover());
    }

    IEnumerator Recover()
    {
        playerweapon.enabled = false;
        yield return new WaitForSeconds(0.25f);
        playerweapon.enabled = true;
        _isHit = false;
        _canJump = false;
    }

    void RigidBodyMove()
    {


        float x = Input.GetAxis(ControllerInputs.horizontalp + _playerNumber);

        if (!_onWall)
        _playerRigidBody2D.velocity = new Vector2(x * _movementSpeed, _playerRigidBody2D.velocity.y);
    }


    private void JumpBool()
    {
        if (Input.GetButtonDown(ControllerInputs.jumpp + _playerNumber))
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
                SoundManager.PlayAudioClip(AudioData.Jump);
                _playerRigidBody2D.velocity = new Vector2(0, _jumpSpeed);

                _spacePressed = true;
                _isGrounded = false;

                _jumpSpeed -= 2f;
                _movementSpeed -= 2f;

                _amountJumps++;
            }
            else
            {
                _spacePressed = false;
                _canJump = false;
            }
                
        }
    }

    void OnCollisionStay2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.ground)
        {
            _isGrounded = true;
            _onWall = false;
            _amountJumps = 0f;
            _movementSpeed = 7f;
            _jumpSpeed = 10f;
        }
        else if (coll.gameObject.tag == GameTags.wallleft || coll.gameObject.tag == GameTags.wallright)
        {
            _onWall = true;
            _amountJumps = 2f;
        }

        if (coll.gameObject.tag == GameTags.wall)
        {
            _isGrounded = false;
            _movementSpeed = 0;
            _jumpSpeed = 6f;
            _playerRigidBody2D.gravityScale = 0.5f;
        }
    }

    void OnCollisionExit2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.wall)
        {
            _movementSpeed = 7f;
            _amountJumps = 1f;
            _playerRigidBody2D.gravityScale = 2f;
        }
    }
}
