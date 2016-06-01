using UnityEngine;
using System.Collections;

public class PlayerMovement : MonoBehaviour {


    //Float
    [SerializeField]
    private float _movementSpeed = 2f;

    public float MovementSpeed
    {
        get { return _movementSpeed; }
        set { _movementSpeed += 0; }
    }

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
    [SerializeField]
    private bool _joystickEnabled = false;
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
     //   CheckInput();
    }

    public void ApplyKnockback(float xPos)
    {
        _isHit = true;
        SoundManager.PlayAudioClip(AudioData.Hit);
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

    void CheckInput()
    {
         int i = 1;
         if (i < PlayerNumber)
         {
             if (Input.GetJoystickNames()[i] != null)
                 _joystickEnabled = true;
         }
         else
             return;
            
    }

    void RigidBodyMove()
    {

        //float x = Input.GetAxis(ControllerInputs.horizontalp + _playerNumber);

        
        float x;

        if (_joystickEnabled)
         x = Input.GetAxis(ControllerInputs.horizontalcp + _playerNumber);
        else
            x = Input.GetAxis(ControllerInputs.horizontalp + _playerNumber);

       


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
        else if (coll.gameObject.CompareTag(GameTags.wallleft) || coll.gameObject.CompareTag(GameTags.wallright))
        {
            _isGrounded = false;
            _amountJumps = 2f;
            _playerRigidBody2D.gravityScale = 0.5f;
            _jumpSpeed = 6f;
            _movementSpeed = 0;
        }

    }

    void OnCollisionExit2D(Collision2D coll)
    {
        if (coll.gameObject.CompareTag(GameTags.wallleft) || coll.gameObject.CompareTag(GameTags.wallright))
        {
            _movementSpeed = 7f;
            _amountJumps = 1f;
            _playerRigidBody2D.gravityScale = 2f;
        }
    }
}
