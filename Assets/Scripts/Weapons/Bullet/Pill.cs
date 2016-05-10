using UnityEngine;
using System.Collections;

public class Pill : MonoBehaviour
{
    [SerializeField] private Rigidbody2D rbPill;
    private bool isRight;
    private bool isLeft;
    private bool bounce;

    //Sets the place the player is facing
    public void ShootLeft()
    {
        isLeft = true;
    }

    //Sets the place the player is facing
    public void ShootRight()
    {
        isRight = true;
    }

    void FixedUpdate()
    {
        if (isRight)
            rbPill.velocity = new Vector2(4, rbPill.velocity.y);
        else if (isLeft)
            rbPill.velocity = new Vector2(-4, rbPill.velocity.y);

        if (bounce)
        {
            rbPill.velocity = new Vector2(rbPill.velocity.x, 5);
            bounce = false;
        }
    }

    void Hit(GameObject player)
    {
        //HP moet eraf
        //Give knockback
        Rigidbody2D rb = player.GetComponent<Rigidbody2D>();
        rb.AddForce(player.transform.right * 500);
        print("push");
    }

    void OnCollisionEnter2D(Collision2D coll)
    {
        if (coll.gameObject != null)
        {
            if (coll.gameObject.tag == "Player")
            {
                Hit(coll.gameObject);
                Destroy(this.gameObject);
            }

            else if (coll.gameObject.tag == "Ground")
            {
                bounce = true;
            }
        }
    }
}
