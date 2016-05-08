using UnityEngine;
using System.Collections;

public class PlayerAnimations : MonoBehaviour {

    Animator _playerAnimations;

    private bool _isGrounded;

    void Start()
    {
        _playerAnimations = this.GetComponent<Animator>();
    }

	void Update () 
    {
        WalkAnimation();
        JumpAnimation();
        AttackAnimation();
	}

    public void WalkAnimation()
    {
        if (_isGrounded)
        {
            if (Input.GetAxis("Horizontal") != 0)
            {
                _playerAnimations.SetBool("Run", true);
                _playerAnimations.SetBool("Idle", false);

                _playerAnimations.SetBool("Jump", false);
                _playerAnimations.SetBool("Attack", false);
            }

            else if (Input.GetAxis("Horizontal") == 0)
            {
                _playerAnimations.SetBool("Run", false);
                _playerAnimations.SetBool("Idle", true);

                _playerAnimations.SetBool("Jump", false);
                _playerAnimations.SetBool("Attack", false);
            }
        }
       
    }

   private void JumpAnimation()
    {
        if (!_isGrounded)
        {
            _playerAnimations.SetBool("Jump", true);
            _playerAnimations.SetBool("Run", false);
            _playerAnimations.SetBool("Idle", false);
            _playerAnimations.SetBool("Attack", false);
        }
           
    }

    private void AttackAnimation()
   {
        if (_isGrounded)
        {
            if (Input.GetButton("Fire1") || Input.GetKeyDown(KeyCode.S))
            {
                _playerAnimations.SetBool("Attack", true);
                _playerAnimations.SetBool("Run", false);
                _playerAnimations.SetBool("Idle", false);
            }
        }
   }

    void OnCollisionStay2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.ground)
            _isGrounded = true;
    }

    void OnCollisionExit2D(Collision2D coll)
    {
        if (coll.gameObject.tag == GameTags.ground)
            _isGrounded = false;
    }
}
