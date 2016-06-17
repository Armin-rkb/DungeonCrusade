using UnityEngine;
using System.Collections;

public class PlayerAnimations : MonoBehaviour {



    // Animator
    [SerializeField]
    Animator _playerAnimations;
    // Animator

    //Bool
    private bool _isGrounded;
    //Bool

    //Scripts
    [SerializeField]
    private PlayerAnimationListener _playerAnimationListener;
    [SerializeField]
    private PlayerMovement _playerMovement;
    [SerializeField]
    private PlayerDeath _playerDeath;
    private PlayerWeapon _playerWeapon;

    bool death;
    //Scripts

    void Awake()
    {
      _playerDeath.OnPlayerDeath += TurnDeathOn;
    }

	void Update () 
    {
        if (!death)
        {
            WalkAnimation();
            JumpAnimation();
            AttackAnimation();
            HadoukenAnimation();
            MicroPhoneAnimation();
            HitAnimation();
        }
           
            DeathAnimation();
	}

    public void TurnDeathOn()
    {
        death = true;
    }

    public void WalkAnimation()
    {
        if (_isGrounded)
        {
            if (Input.GetAxis(ControllerInputs.horizontalcp + _playerMovement.PlayerNumber) != 0 || Input.GetAxis(ControllerInputs.horizontalp + _playerMovement.PlayerNumber) != 0)
            {
                _playerAnimations.SetBool(AnimationStrings.run, true);
                _playerAnimations.SetBool(AnimationStrings.doublejump, false);
                _playerAnimations.SetBool(AnimationStrings.idle, false);
                _playerAnimations.SetBool(AnimationStrings.jumpattack, false);
                _playerAnimations.SetBool(AnimationStrings.doublejumpattack, false);


                _playerAnimations.SetBool(AnimationStrings.jump, false);
                _playerAnimations.SetBool(AnimationStrings.attack, false);
                _playerAnimations.SetBool(AnimationStrings.hit, false);
                _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
                _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);

                
            }

            else if (Input.GetAxis(ControllerInputs.horizontalcp + _playerMovement.PlayerNumber) == 0 || Input.GetAxis(ControllerInputs.horizontalp + _playerMovement.PlayerNumber) == 0)
            {
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.doublejump, false);

                if (!_playerDeath.GetDeath)
                _playerAnimations.SetBool(AnimationStrings.idle, true);
                else
                {
                    _playerAnimations.SetBool(AnimationStrings.idle, false);
                    _playerAnimations.SetBool(AnimationStrings.death, true);
                }

                _playerAnimations.SetBool(AnimationStrings.jumpattack, false);
                _playerAnimations.SetBool(AnimationStrings.doublejumpattack, false);

                _playerAnimations.SetBool(AnimationStrings.jump, false);
                _playerAnimations.SetBool(AnimationStrings.attack, false);
                _playerAnimations.SetBool(AnimationStrings.hit, false);
                _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
                _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);

                
            }
        }
       
    }

    private void HitAnimation()
    {
        if (_playerMovement.GetHitBool)
        {
            _playerAnimations.SetBool(AnimationStrings.hit, true);

            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.doublejump, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);

            _playerAnimations.SetBool(AnimationStrings.jump, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);

            _playerAnimations.SetBool(AnimationStrings.doublejumpattack, false);
            _playerAnimations.SetBool(AnimationStrings.jumpattack, false);
        }
    }

    private void DeathAnimation()
    {

    
        if (death)
        {
            _playerAnimations.SetBool(AnimationStrings.death, true);

            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.doublejump, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);

            _playerAnimations.SetBool(AnimationStrings.jumpattack, false);
            _playerAnimations.SetBool(AnimationStrings.doublejumpattack, false);

            _playerAnimations.SetBool(AnimationStrings.jump, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
            _playerAnimations.SetBool(AnimationStrings.hit, false);
            _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
            _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
        }
            
    }

   private void JumpAnimation()
    {
        if (!_isGrounded && _playerMovement.GetAmountJumps < 2)
        {
            _playerAnimations.SetBool(AnimationStrings.jump, true);
            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
            _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
            _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
        }
        else if (!_isGrounded && _playerMovement.GetAmountJumps == 2)
        {
            _playerAnimations.SetBool(AnimationStrings.jump, false);
            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
            _playerAnimations.SetBool(AnimationStrings.doublejump, true);

            _playerAnimations.SetBool(AnimationStrings.jumpattack, false);

            _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
            _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
        }
    }

    private void AttackAnimation()
   {
       if (_playerAnimationListener.GetNormalAttack && _playerMovement.GetAmountJumps == 0 && _isGrounded)
            {
                _playerAnimations.SetBool(AnimationStrings.attack, true);

                _playerAnimations.SetBool(AnimationStrings.jumpattack, false);

                _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
                _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.idle, false);
            }

            if (_playerAnimationListener.GetNormalAttack && _playerMovement.GetAmountJumps == 1)
            {
                _playerAnimations.SetBool(AnimationStrings.jumpattack, true);
                _playerAnimations.SetBool(AnimationStrings.jump, false);
                _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
                _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.idle, false);
            }

            if (_playerAnimationListener.GetNormalAttack && _playerMovement.GetAmountJumps == 2)
            {
                _playerAnimations.SetBool(AnimationStrings.doublejumpattack, true);
                _playerAnimations.SetBool(AnimationStrings.jumpattack, false);
                _playerAnimations.SetBool(AnimationStrings.doublejump, false);
                _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
                _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
                _playerAnimations.SetBool(AnimationStrings.run, false);
                _playerAnimations.SetBool(AnimationStrings.idle, false);
            }
   }

    private void HadoukenAnimation()
    {
        if (_playerAnimationListener.GetHadoukenAttack)
        {
            _playerAnimations.SetBool(AnimationStrings.hadoukenattack, true);
            _playerAnimations.SetBool(AnimationStrings.microphoneattack, false);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);
            _playerAnimations.SetBool(AnimationStrings.jump, false);
            _playerAnimations.SetBool(AnimationStrings.doublejump, false);
        }
    }

    private void MicroPhoneAnimation()
    {
        if (_playerAnimationListener.GetMusicNoteAttack)
        {
            _playerAnimations.SetBool(AnimationStrings.microphoneattack, true);
            _playerAnimations.SetBool(AnimationStrings.attack, false);
            _playerAnimations.SetBool(AnimationStrings.hadoukenattack, false);
            _playerAnimations.SetBool(AnimationStrings.run, false);
            _playerAnimations.SetBool(AnimationStrings.idle, false);
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
