using UnityEngine;
using System.Collections;

public class PlayerAnimations : MonoBehaviour {

    // Animator
    Animator _playerAnimations;
    // Animator

    //Bool
    private bool _isGrounded;
    //Bool

    //Scripts
    private PlayerMovement _playerMovement;
    //Scripts


    void Start()
    {
        _playerMovement = this.GetComponent<PlayerMovement>();
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
            if (Input.GetAxis(ControllerInputs.horizontalp + _playerMovement.PlayerNumber) != 0)
            {
                _playerAnimations.SetBool(AnimationStrings.run, true);
                _playerAnimations.SetBool(AnimationStrings.idle, false);

                _playerAnimations.SetBool(AnimationStrings.jump, false);
                _playerAnimations.SetBool(AnimationStrings.attack, false);
            }

            else if (Input.GetAxis(ControllerInputs.horizontalp + _playerMovement.PlayerNumber) == 0)
            {
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.idle, true);

                _playerAnimations.SetBool(AnimationStrings.jump, false);
                _playerAnimations.SetBool(AnimationStrings.attack, false);
            }
        }
       
    }

   private void JumpAnimation()
    {
        if (!_isGrounded)
        {
            _playerAnimations.SetBool(AnimationStrings.jump, true);
            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
        }
           
    }

    private void AttackAnimation()
   {
        if (_isGrounded)
        {
            if (Input.GetButtonDown(ControllerInputs.attackp + _playerMovement.PlayerNumber))
            {
                _playerAnimations.SetBool(AnimationStrings.attack, true);
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.idle, false);
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
