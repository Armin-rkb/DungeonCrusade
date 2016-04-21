using UnityEngine;
using System.Collections;

public class PlayerMovement : MonoBehaviour {


    //Float
    [SerializeField]
    private float _movementSpeed = 2f;
    private float _jumpSpeed = 10f;
    private float _gravityPlayer = 20f;
    //Float

    //Vector2
    private Vector2 _moveDirection;
    //Vector2

    //CharacterController
    private CharacterController _playerController;
    //CharacterController

    

    private Rigidbody2D _playerRigidBody2D;

   

   

	void Start ()
    {
        _playerController = this.gameObject.GetComponent<CharacterController>();
       // _playerRigidBody2D = this.gameObject.GetComponent<Rigidbody2D>();
       // Mathf.Clamp(_playerRigidBody2D.velocity.x, -_movementSpeed, _movementSpeed);
	}
	
	void Update ()
    {
        /*
        float x = Input.GetAxis("Horizontal");
        Vector2 movement = new Vector2(x, 0);
        print(_playerRigidBody2D.velocity.x);
       _playerRigidBody2D.AddForce(movement * _movementSpeed);
        */

        if (_playerController.isGrounded)
        {

            _moveDirection = new Vector2(Input.GetAxis("Horizontal"), Input.GetAxis("Vertical"));
            _moveDirection = transform.TransformDirection(_moveDirection);
            _moveDirection *= _movementSpeed;

            if (Input.GetButton("Jump")) //If the Jump button has been pressed...
            {
                _moveDirection.y = _jumpSpeed; //Jump!
            } 
        }
            

            _moveDirection.y -= _gravityPlayer * Time.deltaTime;
            _playerController.Move(_moveDirection * Time.deltaTime);

       
	}
}
