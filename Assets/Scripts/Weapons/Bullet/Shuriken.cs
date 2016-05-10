using UnityEngine;
using System.Collections;

public class Shuriken : MonoBehaviour
{
    [SerializeField]
    private Rigidbody2D rbShuriken;
    private bool isRight;
    private bool isLeft;

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
            rbShuriken.velocity = new Vector2(15, rbShuriken.velocity.y);
        else if (isLeft)
            rbShuriken.velocity = new Vector2(-15, rbShuriken.velocity.y);
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
            else
                Destroy(this.gameObject);
        }
    }
}
