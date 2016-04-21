using UnityEngine;
using System.Collections;

public class PlayerFlip : MonoBehaviour {

    //Bools
    public bool facingRight = true;
    //Bools

	void Update () 
    {
        if (Time.timeScale != 0)
        CheckMovement();
	}

    private void CheckMovement()
    {

        
            float x = Input.GetAxis("Horizontal");

            if (x > 0 && !facingRight)
            {
                FlipSprite();
            }
            else if (x < 0 && facingRight)
            {
                FlipSprite();
            }

    }

    public void FlipSprite()
    {
        facingRight = !facingRight;
        Vector3 theScale = transform.localScale;
        theScale.x *= -1;
        transform.localScale = theScale;
    }
}
