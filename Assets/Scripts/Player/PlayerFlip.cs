using UnityEngine;
using System.Collections;

public class PlayerFlip : MonoBehaviour {

    //Bools
    public bool facingRight = true;
    //Bools

    private SpriteRenderer _playerSpriteRenderer;
    private PlayerMovement _playerMovement;

    void Start()
    {
        _playerMovement = this.GetComponent<PlayerMovement>();
        _playerSpriteRenderer = this.GetComponent<SpriteRenderer>();
    }

	void Update () 
    {
        if (Time.timeScale != 0)
        CheckMovement();
	}

    private void CheckMovement()
    {


        float x = Input.GetAxis(ControllerInputs.horizontalcp + _playerMovement.PlayerNumber);

            if (x > 0 && !facingRight)
            {
                FlipRight();
            }
            else if (x < 0 && facingRight)
            {
                FlipLeft();
            }

    }

    public void FlipSprite()
    {
        facingRight = !facingRight;
        Vector3 theScale = transform.localScale;
        theScale.x *= -1;
        transform.localScale = theScale;
    }

    public void FlipRight()
    {
        facingRight = !facingRight;
        _playerSpriteRenderer.flipX = false;
    }

    public void FlipLeft()
    {
        facingRight = !facingRight;
        _playerSpriteRenderer.flipX = true;
    }
}
